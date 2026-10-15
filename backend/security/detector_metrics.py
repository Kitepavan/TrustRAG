"""Small, deterministic metrics for labeled detector evaluations."""


def calculate_detection_metrics(expected: list[bool], predicted: list[bool]) -> dict[str, int | float]:
    if len(expected) != len(predicted):
        raise ValueError("expected and predicted must have equal lengths")

    tp = sum(want and got for want, got in zip(expected, predicted))
    fp = sum(not want and got for want, got in zip(expected, predicted))
    tn = sum(not want and not got for want, got in zip(expected, predicted))
    fn = sum(want and not got for want, got in zip(expected, predicted))
    return {
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "precision": tp / (tp + fp) if tp + fp else 0.0,
        "recall": tp / (tp + fn) if tp + fn else 0.0,
        "false_positive_rate": fp / (fp + tn) if fp + tn else 0.0,
    }
