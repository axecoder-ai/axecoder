Complete the feature using this strict TDD workflow:

1. Based on the requirement plan, identify the code to change or add and the modules involved.
2. In the project directory, look first for unit tests under `tests/unittest/UT-[feature]/`:
   - If missing, create the directory and test file
   - If present, reuse it
3. For the logic being changed, ensure unit test coverage:
   - No tests → write full unit tests
   - Existing tests → extend coverage
   - Logic changed → update the corresponding tests
   - Logic unchanged → keep coverage as high as practical
4. Implement or modify the business code based on the requirements and tests.
5. Run the full unit test suite; development is complete only when all tests pass. If any fail, return to step 4 and fix the code.
6. Finally, output an **Implementation Report** including:
   - Feature summary
   - List of changed files
   - Unit test coverage notes
   - Test results
   - Notes and caveats
