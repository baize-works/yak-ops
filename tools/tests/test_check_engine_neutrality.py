import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "check-engine-neutrality.py"
SPEC = importlib.util.spec_from_file_location("check_engine_neutrality", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class GrowthErrorsTest(unittest.TestCase):
    def test_rejects_new_file_and_increased_count(self):
        errors = MODULE.growth_errors(
            {"existing.java": 3, "new.java": 1}, {"existing.java": 2}, []
        )
        self.assertEqual(
            errors,
            [
                "vendor-token debt grew in existing.java: 3 > 2",
                "vendor-token debt grew in new.java: 1 > 0",
            ],
        )

    def test_allows_removal_and_compatibility_paths(self):
        errors = MODULE.growth_errors(
            {"shrinking.java": 1, "legacy/vendor.java": 99},
            {"shrinking.java": 2},
            [MODULE.re.compile(r"^legacy/")],
        )
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
