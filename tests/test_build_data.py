"""Topic tag ("Calibration & state estimation"): what it must and must not match."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from build_data import is_topic, topics_of  # noqa: E402


class TopicTag(unittest.TestCase):
    def test_matches_core_topics_in_titles(self):
        for title in [
            "Online Extrinsic Calibration of LiDAR-Camera Systems",
            "A Visual-Inertial Odometry Benchmark",
            "Robust VINS with Line Features",
            "Factor Graph SLAM for Legged Robots",
            "Proprioceptive-Only State Estimation for Legged Robots",
            "Rolling-Shutter Aware Bundle Adjustment",
            "SurgCalib: Gaussian Splatting-Based Hand-Eye Calibration",
            "Invariant Kalman Filtering on Lie Groups",
        ]:
            self.assertTrue(is_topic(title, []), title)

    def test_matches_topic_keywords(self):
        self.assertTrue(is_topic("Some Title", ["Calibration and Identification"]))
        self.assertTrue(is_topic("Some Title", ["Localization"]))
        self.assertTrue(is_topic("Some Title", ["Visual-Inertial SLAM"]))

    def test_rejects_v1_false_positives(self):
        for title, keywords in [
            ("SonoRank: Towards Calibration-Free Real-Time Finger Flexion Detection", ["Prosthetics and Exoskeletons"]),
            ("4DRadar-GS: Self-Supervised Dynamic Driving Scene Reconstruction", ["Sensor Fusion", "Mapping"]),
            ("Anomaly-Informed Confidence Calibration for Vision-Based Safety Prediction", ["Robot Safety"]),
            ("Sound Source Localization with a Microphone Array", ["Robot Audition"]),
        ]:
            self.assertFalse(is_topic(title, keywords), title)


class Topics(unittest.TestCase):
    def test_tags_from_title_and_keywords(self):
        self.assertEqual(topics_of("Tightly Coupled LiDAR-Inertial Odometry", ["SLAM"]), ["slam", "inertial"])
        self.assertEqual(topics_of("Open-Vocabulary 3D Semantic Mapping", []), ["semantic", "mapping"])
        self.assertEqual(topics_of("Monte Carlo Localization in Prior Maps", []), ["localization", "mapping"])
        self.assertEqual(topics_of("StereoSplat+: Feed-Forward Stereo Gaussian Splatting", []), ["feed-forward"])
        self.assertEqual(topics_of("A Transformer for Place Recognition", []), ["feed-forward"])
        self.assertEqual(topics_of("Some Title", ["Calibration and Identification"]), ["calibration"])

    def test_no_false_hits(self):
        self.assertEqual(topics_of("Confidence Calibration for Safety Prediction", ["Robot Safety"]), [])
        self.assertEqual(topics_of("Grasping Soft Objects", ["Grasping"]), [])


if __name__ == "__main__":
    unittest.main()
