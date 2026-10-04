"""Topic tag ("Calibration & state estimation"): what it must and must not match."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from build_data import is_topic  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
