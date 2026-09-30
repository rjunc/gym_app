# Working on this repo

- **Branch:** make changes directly on `main`, then commit and push to
  `origin main`. No feature branches or pull requests unless asked.
- **No existing data to migrate:** there is no real user data yet, so data
  shape changes don't need migrations, remediation scripts or backward
  compatibility with old records. Design for the future shape only.
- **Keep the test data generator in step:** whenever a change adds or changes
  the data shape (a new field, record type or collection), update the test
  data generator (`src/lib/demoData.js`, and the `collections` list in
  `src/App.jsx` for a new collection) in the same change, so generated data
  exercises the new shape.
- **Plan before building:** when asked to discuss or plan a feature, don't
  write code until the plan is agreed.
