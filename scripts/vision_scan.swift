// On-device text + face scan of poster photos with Apple's Vision framework (macOS only).
//   swift scripts/vision_scan.swift photos/raw > photos/scan.json
// For each photo: EXIF capture time, OCR lines (largest text first, so poster titles lead),
// face boxes and upper-body person boxes (catches people in profile or from behind), all in
// 1600 px-preview coordinates (the frame photos/matches.json uses).
import Foundation
import ImageIO
import Vision

struct Line: Codable { let text: String; let height: Double; let box: [Int] }
struct Result: Codable { let file: String; let taken: String?; let width: Int; let height: Int; let lines: [Line]; let faces: [[Int]]; let people: [[Int]] }

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(atPath: dir.path)
  .filter { $0.lowercased().hasSuffix(".jpg") }.sorted()
var out: [Result] = []

for name in files {
  let url = dir.appendingPathComponent(name)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
  let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [String: Any]
  let exif = props?[kCGImagePropertyExifDictionary as String] as? [String: Any]
  let rawOrient = (props?[kCGImagePropertyOrientation as String] as? UInt32) ?? 1
  let orient = CGImagePropertyOrientation(rawValue: rawOrient) ?? .up

  let text = VNRecognizeTextRequest()
  text.recognitionLevel = .accurate
  text.usesLanguageCorrection = true
  let faces = VNDetectFaceRectanglesRequest()
  let people = VNDetectHumanRectanglesRequest()
  people.upperBodyOnly = true
  try? VNImageRequestHandler(cgImage: img, orientation: orient).perform([text, faces, people])

  // Upright size after EXIF rotation (orientations 5-8 swap width and height).
  let swap = rawOrient >= 5
  let w = swap ? img.height : img.width, h = swap ? img.width : img.height
  let scale = 1600.0 / Double(max(w, h))
  // Vision boxes are normalized with origin bottom-left; pad = extra margin as a fraction of the box size.
  func preview(_ b: CGRect, pad: Double = 0) -> [Int] {
    let px = b.width * pad, py = b.height * pad
    let x0 = max(0, b.minX - px), x1 = min(1, b.maxX + px)
    let y0 = max(0, 1 - b.maxY - py), y1 = min(1, 1 - b.minY + py)
    return [x0 * Double(w), y0 * Double(h), x1 * Double(w), y1 * Double(h)].map { Int(($0 * scale).rounded()) }
  }
  let lines = (text.results ?? []).compactMap { obs -> Line? in
    guard let t = obs.topCandidates(1).first?.string else { return nil }
    return Line(text: t, height: Double(obs.boundingBox.height), box: preview(obs.boundingBox))
  }.sorted { $0.height > $1.height }
  // Pad faces by 35% so hair and chin are covered too.
  let faceBoxes = (faces.results ?? []).map { preview($0.boundingBox, pad: 0.35) }
  let peopleBoxes = (people.results ?? []).filter { $0.confidence > 0.3 }.map { preview($0.boundingBox, pad: 0.05) }
  out.append(Result(file: name, taken: exif?[kCGImagePropertyExifDateTimeOriginal as String] as? String,
                    width: w, height: h, lines: lines, faces: faceBoxes, people: peopleBoxes))
  FileHandle.standardError.write("\(name): \(lines.count) lines, \(faceBoxes.count) faces, \(peopleBoxes.count) people\n".data(using: .utf8)!)
}

let enc = JSONEncoder()
enc.outputFormatting = [.prettyPrinted, .sortedKeys]
FileHandle.standardOutput.write(try enc.encode(out))
