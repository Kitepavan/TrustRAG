from scripts.evaluate_injection_detector import select_threshold


def test_threshold_maximizes_development_f1_and_uses_lower_tied_cutoff():
    threshold = select_threshold(
        labels=[True, True, False, False],
        scores=[0.9, 0.8, 0.6, 0.2],
    )

    assert threshold == 0.7
