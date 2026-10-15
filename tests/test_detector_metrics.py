from backend.security.detector_metrics import calculate_detection_metrics


def test_detection_metrics_confusion_counts():
    metrics = calculate_detection_metrics(
        expected=[True, False, True, False],
        predicted=[True, True, False, False],
    )
    assert metrics == {
        "tp": 1, "fp": 1, "tn": 1, "fn": 1,
        "precision": 0.5, "recall": 0.5, "false_positive_rate": 0.5,
    }


def test_detection_metrics_zero_denominator():
    metrics = calculate_detection_metrics(expected=[False, False], predicted=[False, False])
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["false_positive_rate"] == 0.0
