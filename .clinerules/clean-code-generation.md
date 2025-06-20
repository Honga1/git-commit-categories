---
description: Guidelines for generating clean code, avoiding common pitfalls, and utilizing automated tools for feedback.
author: Jae
version: 1.0
globs: ["**/*.js", "**/*.ts", "**/*.py"]
tags: ["coding-guideline", "clean-code", "automation"]
injection_strategy: "on_new_task"
---

# Clean Code Generation Rule

## Objective
Guide the LLM agent in generating clean, efficient, and maintainable code by adhering to best practices and utilizing automated tools for feedback and improvement. This rule helps the agent avoid common issues such as dead code, unused exports, incorrect method privacy, useless comments, unformatted code, unused dependencies, and general cruft.

## Introduction
This rule provides a structured approach for the LLM agent to follow when generating code, ensuring that the output is free from common issues and adheres to best practices. By following the workflow and behavioral instructions outlined below, the agent can produce high-quality code that is easier to maintain and less prone to errors.

## Workflow

1. **Understand Requirements:**
   - Before writing any code, ensure a thorough understanding of the task requirements.
   - If there are ambiguities, ask the user for clarification.

2. **Plan the Code Structure:**
   - Outline the necessary components (functions, classes, modules).
   - Avoid over-engineering; only include what is essential for the task.

3. **Generate Code Incrementally:**
   - Write code in small, manageable sections.
   - After each section, perform a self-review using the checklist below.

4. **Self-Review Checklist:**
   - **Dead Code:** Ensure there are no unused functions, variables, or code blocks.
   - **Exports:** Verify that all exported items are necessary and used.
   - **Method Privacy:** Confirm that methods are private if they are only used within the class, and public if they need to be accessed externally. Follow the principle of least privilege: expose only what is necessary.
   - **Comments:** Remove comments that do not add value; keep only those that explain complex logic or provide necessary context. Focus on "why" rather than "what".
   - **Dependencies:** Ensure that all imported dependencies are used in the code.
   - **Formatting:** Although automated, check for any formatting issues that might have been missed.
   - **Reasoning Rubric (WHAT/WHY/WHERE/HOW/HOW MUCH/HOW LONG):**
     - **WHAT:** Describe the unit (function, class, module) in one sentence.
     - **WHY:** Explain the rationale for its existence.
     - **WHERE:** Specify where it fits in the overall flow.
     - **HOW:** Provide a high-level algorithm or pattern.
     - **HOW MUCH:** Estimate expected complexity, performance cost (e.g., O(n)), or memory usage.
     - **HOW LONG:** Define the expected temporal lifecycle (e.g., long-lived object vs. throw-away).

5. **Use Automated Tools:**
   - The system will automatically run the following tools on the generated code:
     - **Linter:** To detect syntax errors, unused code, etc. (e.g., ESLint for JavaScript/TypeScript).
     - **Formatter:** To ensure consistent code style (e.g., Prettier).
     - **Dependency Checker:** To identify unused dependencies or code (e.g., Knip).
   - The agent will receive feedback from these tools.

6. **Incorporate Feedback:**
   - If the tools report issues, revise the code accordingly.
   - For example, if the linter indicates an unused variable, remove it or ensure it is used appropriately.

7. **Iterate:**
   - Repeat steps 3-6 until the code passes all automated checks.

8. **Final Review:**
   - Perform a final manual review to ensure the code meets the requirements and is free from the specified issues.

## Behavioral Instructions
- **MUST** write only the code necessary for the task.
- **MUST NOT** leave unused code, variables, or dependencies.
- **SHOULD** use descriptive and meaningful names for variables and functions.
- **SHOULD NOT** add comments that merely describe what the code does; comments should explain why certain decisions were made or clarify complex logic.
- **MUST** ensure method privacy is set correctly:
  - Private for methods used only within the class.
  - Public for methods that need to be accessed externally.
- **MUST** rely on automated formatting but be aware of the style conventions.

## Tool Integration
The following tools are integrated into the workflow:
- **Linter:** Configured for the specific programming language (e.g., ESLint for JavaScript/TypeScript with sensible defaults and flat config).
- **Formatter:** Such as Prettier, to maintain consistent code style, integrated with ESLint via plugins like `eslint-plugin-prettier`.
- **Dependency Checker:** Tools like Knip to detect unused dependencies, files, or exports.

These tools will run automatically after code generation, and their output will be provided to the agent for revision.

## Feedback Mechanism
- After generating code, the system will process it through the automated tools.
- Any issues or suggestions will be compiled and presented to the agent.
- The agent must then update the code based on this feedback.
- This process repeats until the code is clean and passes all checks.

## Additional Guidelines
- **Method Privacy:**
  - If a method is only called within the same class, it **MUST** be private.
  - If a method needs to be accessed by other classes or modules, it **MUST** be public.
  - Follow the principle of least privilege: expose only what is necessary.
- **Comments:**
  - Add comments to explain the purpose of a function or class.
  - Comment on non-obvious logic or algorithms.
  - **AVOID** comments that simply restate what the code does.
- **Dependencies:**
  - Before importing a library, ensure it is necessary for the task.
  - Regularly review and remove unused imports (use tools like Knip via `npm run lint:knip` before committing).

## Example
While specific code examples are language-dependent, the principles remain the same. For instance, in JavaScript/TypeScript:

**Avoid:**
```javascript
// This function is not used anywhere
function unusedFunction() {
  console.log('This is never called');
}

// Importing a module that's not used
import { unusedModule } from 'some-library';

class MyClass {
  publicMethod() {
    // This should be private if only used internally
  }
}
```

**Prefer:**
```javascript
class MyClass {
  #privateMethod() {
    // Correctly set as private
  }

  publicMethod() {
    this.#privateMethod();
  }
}

// Only import what's necessary
import { usedModule } from 'some-library';
```

**Reasoning Rubric Example (WHAT/WHY/WHERE/HOW/HOW MUCH/HOW LONG):**
- **WHAT:** This `MyClass` class manages user data validation.
- **WHY:** To ensure data integrity before submission to the backend.
- **WHERE:** Sits between the UI form and API service layer.
- **HOW:** Iterates over fields applying regex and boundary checks.
- **HOW MUCH:** O(n) time where n is the number of fields; minimal memory.
- **HOW LONG:** Long-lived; instantiated per session and reused.

##
## Conclusion
By following this rule, the LLM agent can significantly reduce common coding errors and produce cleaner, more efficient code. The combination of self-review, automated tools (like ESLint, Prettier, and Knip), and iterative feedback ensures that the final output is of high quality and maintainable. The recent improvements demonstrate how systematic refactoring can address security, performance, and reliability concerns while maintaining code readability and maintainability.
