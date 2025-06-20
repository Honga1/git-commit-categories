---
description: Comprehensive guidelines for writing type-safe, explicit TypeScript code with strict boolean logic and functional patterns
author: Jae
version: 1.0
globs: ['**/*.ts', '**/*.tsx']
tags: ['typescript', 'type-safety', 'coding-standards', 'functional-programming']
---

# Strict TypeScript Patterns

## Brief overview

This rule establishes strict TypeScript coding patterns that prioritize type safety, explicit logic, and maintainable code structure. These guidelines prevent common type-related bugs and ensure consistent, readable code. The philosophy emphasizes explicit over implicit, functional over imperative where appropriate, and early returns over nested conditionals.

## Conditional Expression Patterns

The core principle: **Use the right conditional pattern based on the TypeScript type**. This prevents runtime errors and makes code intentions explicit.

### Type-Based Conditional Rules

- **Pure boolean types** (`boolean`): Use directly in conditionals
- **Boolean-returning functions**: Use directly in conditionals
- **Boolean properties**: Use directly in conditionals
- **Nullable/optional types**: Require explicit comparison
- **Non-boolean types**: Require explicit comparison
- **Always use `===` and `!==`** for all equality comparisons

### ✅ Always Safe Patterns

```typescript
// Pure boolean types - direct usage
interface User {
  isActive: boolean;
  isDeleted: boolean;
}

if (user.isActive) activateUser(user);
if (!user.isDeleted) processUser(user);

// Boolean-returning functions - direct usage
function isValid(data: unknown): boolean {
  /* ... */
}
function isEmpty(array: unknown[]): boolean {
  /* ... */
}

if (isValid(data)) processData(data);
if (!isEmpty(array)) processArray(array);

// Boolean properties from well-typed objects - direct usage
interface Config {
  enabled: boolean;
  debugMode: boolean;
}

if (config.enabled) runFeature();
if (!settings.debugMode) hideDebugInfo();
```

### ✅ Explicit Comparison Patterns

```typescript
// Null/undefined checks - always explicit
if (value === null) return;
if (status !== undefined) handleStatus(status);
if (data !== null && data !== undefined) processData(data);

// Non-boolean types - always explicit
if (array.length > 0) processArray(array);
if (string !== '') processString(string);
if (count >= 1) processCount(count);
if (object !== null) processObject(object);

// Nullable boolean types - explicit comparison required
interface User {
  isVerified?: boolean; // Could be undefined
  isPremium: boolean | null; // Could be null
}

if (user.isVerified === true) grantAccess(user);
if (user.isPremium !== false) showPremiumFeature(user);
if (user.isVerified !== undefined) checkVerificationStatus(user);
```

### ❌ Forbidden Patterns

```typescript
// Truthy/falsy shortcuts on non-boolean types
if (!value) return; // ❌ What if value is 0, '', false?
if (array.length) process(); // ❌ Implicit number to boolean
if (string) processString(); // ❌ Implicit string to boolean
if (object) processObject(); // ❌ Implicit object to boolean

// Unnecessary explicit comparisons on pure booleans
if (user.isActive === true) activate(); // ❌ Redundant comparison
if (isValid() === true) process(); // ❌ Redundant comparison
if (config.enabled !== false) run(); // ❌ Redundant comparison

// Dangerous type coercion
if (!!value) process(); // ❌ Double negation coercion
if (+stringNumber) calculate(); // ❌ Unary plus coercion
if (Boolean(value)) handle(); // ❌ Explicit coercion
```

### ⚠️ Context-Dependent Patterns

```typescript
// Ternary expressions - same rules apply
const message = user.isActive ? 'Active' : 'Inactive'; // ✅ Boolean type
const status = count > 0 ? 'Has items' : 'Empty'; // ✅ Explicit comparison
const result = value ? 'truthy' : 'falsy'; // ❌ Avoid truthy/falsy

// Logical operators - be explicit about intent
const userName = user?.name ?? 'Anonymous'; // ✅ Nullish coalescing
const config = userConfig || defaultConfig; // ❌ Falsy fallback (use ??)
const shouldProcess = isValid && hasPermission; // ✅ Both are boolean
const canAccess = user && user.isActive; // ❌ Mixed types (use user !== null && user.isActive)

// Complex conditions - maintain type safety
if (user !== null && user.isActive && user.permissions.length > 0) {
  // ✅ Each part is explicitly typed
  processUser(user);
}

if (data && data.items && data.items.length) {
  // ❌ Truthy checks mixed with explicit checks
  processItems(data.items);
}
```

### Real-World Examples

```typescript
// API Response Handling
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ✅ Correct approach
function handleResponse<T>(response: ApiResponse<T>): void {
  if (response.success === true && response.data !== undefined) {
    processData(response.data);
  } else if (response.success === false && response.error !== undefined) {
    handleError(response.error);
  }
}

// ❌ Problematic approach
function handleResponseBad<T>(response: ApiResponse<T>): void {
  if (response.success && response.data) {
    // Mixed boolean and truthy checks
    processData(response.data);
  } else if (!response.success && response.error) {
    // Negation of boolean with truthy
    handleError(response.error);
  }
}

// Form Validation
interface FormData {
  email: string;
  isSubscribed: boolean;
  age?: number;
}

// ✅ Correct validation
function validateForm(form: FormData): boolean {
  if (form.email === '') return false;
  if (form.age !== undefined && form.age < 18) return false;
  // isSubscribed is boolean, can use directly
  return true;
}

// ❌ Problematic validation
function validateFormBad(form: FormData): boolean {
  if (!form.email) return false; // Truthy check on string
  if (form.age && form.age < 18) return false; // Truthy check on optional number
  return true;
}
```

## Type safety first

- **MUST** use nullish coalescing (`??`) instead of logical OR (`||`) for default values
- **MUST** use optional chaining (`?.`) for safe property access
- **MUST NOT** use `any` type except for unparsed external input
- **MUST** provide explicit return types for all functions

✅ **Type-safe patterns:**

```typescript
// Nullish coalescing - only null/undefined trigger default
const config = userConfig ?? defaultConfig;

// Optional chaining for safe access
const userName = user?.profile?.name;

// Explicit function return types
function processUser(user: User): ProcessResult {
  return { success: true, data: user };
}

// Union types for multiple possibilities
type Status = 'pending' | 'approved' | 'rejected';
```

❌ **Type-unsafe patterns:**

```typescript
const config = userConfig || defaultConfig; // Falsy values trigger default
const userName = user.profile.name; // Unsafe property access
const data: any = parseInput(); // Losing type information
function process(user) {
  return user;
} // Missing return type
```

## Code structure patterns

- **PREFER** union types (sum types) over complex objects with many optional properties
- **MUST** use classes only when modeling stateful objects with behavior, not for namespacing
- **PREFER** pure functional code written in idiomatic TypeScript style
- **MUST** use consistent type imports and exports
- **PREFER** interfaces over type aliases for object shapes
- **MUST NOT** use enums - they don't work well in TypeScript

✅ **Good structure patterns:**

```typescript
// ✅ Tagged union types for explicit state combinations
type ApiResponse =
  | { status: 'success'; data: User[] }
  | { status: 'error'; message: string; code: number }
  | { status: 'loading' };

// ✅ Interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ String literal unions instead of enums
type UserRole = 'admin' | 'user' | 'guest';

// ✅ Pure functional approach
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Classes for stateful behavior only
class UserSession {
  private isActive = false;

  activate(): void {
    this.isActive = true;
  }
}

// ✅ Type-only imports
import type { User, Config } from './types';
import { processUser } from './utils';
```

❌ **Poor structure patterns:**

```typescript
// ❌ Complex object with unclear state combinations
interface ApiResponse {
  data?: User[];
  error?: string;
  status?: string;
  message?: string;
  // This allows invalid combinations like { error: 'msg', data: [...] }
}

// ❌ Using enums (problematic in TypeScript)
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

// ❌ Type alias for simple object shape (prefer interface)
type User = {
  id: string;
  name: string;
};

// ❌ Class used for namespacing
class Utils {
  static formatDate(date: Date): string { ... }
  static parseJson(json: string): object { ... }
}

// ❌ Mixed imports
import { User, processUser, Config } from './types';
```

## Control flow best practices

- **MUST** use early returns to reduce nesting and focus on main logic
- **MUST NOT** use short-circuit evaluation for side effects (`condition && doSomething()`)
- **MUST NOT** use ternary operators when there's no return value
- **MUST** handle all cases in switch statements (enforced by exhaustiveness check)

✅ **Clean control flow:**

```typescript
// ✅ Early returns for edge cases
function processUser(user: User | null): string {
  if (user === null) return 'No user provided';
  if (user.isDeleted === true) return 'User deleted';
  if (user.permissions.length === 0) return 'No permissions';

  // Main logic without nesting
  return generateUserReport(user);
}

// ✅ Explicit conditional execution
if (shouldLog === true) {
  console.log('Processing user');
}

// ✅ Ternary only for return values
const message = isError === true ? 'Error occurred' : 'Success';
```

❌ **Poor control flow:**

```typescript
// ❌ Nested conditions instead of early returns
function processUser(user: User | null): string {
  if (user !== null) {
    if (user.isDeleted !== true) {
      if (user.permissions.length > 0) {
        // Main logic buried in nesting
        return generateUserReport(user);
      }
    }
  }
  return 'Cannot process user';
}

// ❌ Side effect short-circuiting
shouldLog && console.log('Processing'); // Avoid this pattern

// ❌ Ternary for side effects
isError ? showError() : showSuccess(); // No return value
```

## Type assertion guidelines

- **MUST NOT** use non-null assertion (`!`) for unsafe type assertions
- **MAY** use `!` for boolean negation and safe object chaining when certainty exists
- **MUST** prefer type guards and proper null checks over assertions

✅ **Safe assertion usage:**

```typescript
// Boolean negation - safe
const isInvalid = !isValid(data);

// Non-null assertion - crashes loudly if null/undefined (runtime safety)
const email = getValue()!.email; // Will throw if getValue() returns null/undefined

// Object chaining when certain (after null check)
if (user !== null) {
  const email = user.profile!.email; // Safe after null check
}

// Type guards instead of assertions
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

❌ **Unsafe assertion usage:**

```typescript
// Unsafe type assertion - bypasses type checking with no runtime safety
const user = data as User; // Could be wrong type, no runtime check

// Unsafe type assertion - assumes return type without verification
const value = getValue() as string; // Could be wrong type, no runtime check
```

## Import and export patterns

- **MUST** use `import type` for type-only imports
- **MUST** use `export type` for type-only exports
- **MUST NOT** have duplicate imports from the same module
- **MUST** organize imports: types first, then values

✅ **Correct import patterns:**

```typescript
// Type-only imports first
import type { User, Config, ApiResponse } from './types';
import type { ComponentProps } from 'react';

// Value imports
import { processUser, validateConfig } from './utils';
import { useState } from 'react';
```

❌ **Incorrect import patterns:**

```typescript
// Mixed type and value imports
import { User, processUser, Config } from './types';

// Duplicate imports
import { User } from './types';
import { Config } from './types';
```

## Naming conventions

- **MUST** use PascalCase for interfaces, type aliases, and classes
- **MUST NOT** prefix interfaces with 'I' (Hungarian notation)
- **MUST** use descriptive names that indicate purpose and type

✅ **Good naming:**

```typescript
// ✅ Interface with PascalCase
interface User {
  id: string;
  name: string;
}

// ✅ Type alias with PascalCase
type ApiStatus = 'loading' | 'success' | 'error';

// ✅ Class with PascalCase
class DatabaseConnection {
  connect(): Promise<void> { ... }
}
```

❌ **Poor naming:**

```typescript
// ❌ Hungarian notation
interface IUser { ... }

// ❌ Wrong casing
type apiStatus = 'loading';

// ❌ Unclear abbreviation
class dbConn { ... }
```

## Error handling best practices

- **MUST** wrap try/catch blocks as tightly as possible around statements that can throw
- **MUST** type catch parameters as `unknown` and use type guards for error handling
- **MUST NOT** catch multiple different error types in a single try/catch block

✅ **Tight error handling:**

```typescript
// ✅ Separate try/catch for each potential error source
try {
  const result = maybeThrowValidationError();
} catch (err: unknown) {
  if (err instanceof ValidationError) {
    handleValidationError(err);
  }
}

try {
  const data = maybeThrowNetworkError();
} catch (err: unknown) {
  if (err instanceof NetworkError) {
    handleNetworkError(err);
  }
}
```

❌ **Overly broad error handling:**

```typescript
// ❌ Single try/catch catching multiple error types
try {
  const result = maybeThrowValidationError();
  const data = maybeThrowNetworkError();
  const processed = maybeThrowProcessingError();
} catch (err: unknown) {
  if (err instanceof ValidationError) {
    handleValidationError(err);
  }
  if (err instanceof NetworkError) {
    handleNetworkError(err);
  }
  if (err instanceof ProcessingError) {
    handleProcessingError(err);
  }
}
```

## Function signature requirements

- **MUST** provide explicit return types for all functions
- **MUST** provide explicit parameter types
- **SHOULD** prefer readonly parameters when mutation is not needed

✅ **Explicit function signatures:**

```typescript
function calculateTax(amount: number, rate: number): number {
  return amount * rate;
}

async function fetchUser(id: string): Promise<User | null> {
  const response = await api.get(`/users/${id}`);
  return response.data ?? null;
}

function processItems(items: readonly Item[]): ProcessedItem[] {
  return items.map((item) => ({ ...item, processed: true }));
}
```

❌ **Implicit signatures:**

```typescript
function calculateTax(amount, rate) {
  // Missing parameter types
  return amount * rate; // Missing return type
}

async function fetchUser(id) {
  // Missing types
  return await api.get(`/users/${id}`);
}
```
