# Inkject

A lightweight, powerful JavaScript template engine with support for conditionals, variables, and nested data structures.

## Features

- **Zero dependencies** - Pure JavaScript implementation
- **Variable interpolation** with nested object support
- **Conditional rendering** with if/elseif/else logic
- **Inline conditionals** for compact templates
- **Nested conditionals** for complex logic
- **Customizable delimiters** - Use any delimiter you want
- **Clean syntax** - Easy to read and write templates

## Installation

```javascript
// Include the inkject class in your project
const inkject = require('inkject');
const renderer = new inkject();
```

## Basic Usage

```javascript
const template = "Hello &name&! You have &messages& new messages.";
const data = { 
    name: "Alice", 
    messages: 5 
};

const result = renderer.render(template, data);
console.log(result); // "Hello Alice! You have 5 new messages."
```

## Syntax Reference

### Variable Interpolation

Access data using dot notation for nested objects:

```javascript
const template = `
Welcome &user.name&!
Email: &user.profile.email&
Score: &stats.points&
`;

const data = {
    user: {
        name: "John",
        profile: { email: "john@example.com" }
    },
    stats: { points: 1250 }
};
```

### Custom Delimiters

Change delimiters by passing a third parameter:

```javascript
// Using $$ as delimiters
renderer.render("Hello $$name$$", { name: "World" }, "$$$$");
// NOTE: It splits the delimiter string in two, so $$$$ means $$ for start and $$ for end

// Using different open/close delimiters
renderer.render("Hello {{name}}", { name: "World" }, "{{}}");

// Using triple delimiters
renderer.render("Hello $$$name$$$", { name: "World" }, "$$$$$$");
```

### Conditionals

#### Basic If/Else

```javascript
const template = `
&#if user.isActive&
Welcome back, &user.name&!
&#else&
Please activate your account.
&/if&
`;
```

#### If/Elseif/Else Chains

```javascript
const template = `
&#if user.role === "admin"&
🔑 Administrator Access
&#elseif user.role === "manager"&
👔 Manager Access
&#else&
👤 Standard User
&/if&
`;
```

#### Inline Conditionals

Perfect for conditional text within sentences:

```javascript
const template = `
You have &#if notifications > 0&&notifications& new&#else&no&/if& notifications.
Status: &#if user.isActive&✅ Active&#else&❌ Inactive&/if&`;
```

### Comparison Operators

Support for all common comparison operators:

- `===` - Strict equality
- `!==` - Strict inequality
- `==` - Loose equality
- `!=` - Loose inequality
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

```javascript
const template = `
&#if age >= 18&
You are an adult.
&#elseif age >= 13&
You are a teenager.
&#else&
You are a child.
&/if&`;
```

### Negation

Use `!` to negate conditions:

```javascript
const template = `
&#if !user.isSubscribed&
Subscribe now for premium features!
&/if&
`;
```

### Nested Conditionals

Create complex logic with nested conditions:

```javascript
const template = `
&#if user.isActive&
    Welcome, &user.name&!
    &#if user.role === "admin"&
        &#if company.employees > 100&
        Managing large organization (&company.employees& employees)
        &#else&
        Managing small team (&company.employees& employees)
        &/if&
    &/if&
&/if&
`;
```

## Examples

### User Dashboard

```javascript
const dashboardTemplate = `
=== USER DASHBOARD ===

Welcome, &user.name&!

&#if user.role === "admin"&
🔑 ADMIN ACCESS GRANTED
You have full system privileges.

&#if company.employees > 100&
📊 Large Company Management:
- Company: &&company.name&&
- Total Employees: &&company.employees&
&#else&
📊 Small Company Management:
- Company: &&company.name&&
- Team Size: &company.employees&
&/if&

&#elseif user.role === "manager"&
👔 MANAGER ACCESS
You can view team data and reports.
&#else&
👤 USER ACCESS
Limited access to personal data only.
&/if&

Account Status: &#if user.isActive&✅ Active&#else&❌ Inactive&/if&
`;

const data = {
    user: {
        name: "Alice Johnson",
        role: "admin",
        isActive: true
    },
    company: {
        name: "TechCorp",
        employees: 150
    }
};

console.log(renderer.render(dashboardTemplate, data));
```

## API Reference

### `render(template, data, delimiter)`

Renders a template with the provided data.

**Parameters:**
- `template` (string): The template string to render
- `data` (object): The data object containing variables
- `delimiter` (string, optional): Custom delimiter (default: '&&')

**Returns:** Rendered string

### Delimiter Rules

- **Even length**: Split in half for open/close (e.g., `{{}}` -> `{{` and `}}`)
- **Odd length**: Same delimiter for open/close (e.g., `$$$` -> `$$$` and `$$$`)

## Error Handling

Inkject handles errors gracefully:

- **Missing variables**: Returns empty string
- **Undefined nested properties**: Returns empty string
- **Invalid conditions**: Evaluates to false
- **Malformed templates**: Processes what it can, leaves invalid syntax unchanged

## Performance Tips

1. **Reuse renderer instances** - Create one `inkject` instance and reuse it
2. **Simple conditions** - Complex JavaScript expressions aren't supported
3. **Avoid deep nesting** - Keep conditional nesting reasonable for readability
4. **Cache templates** - Store frequently used templates in variables

## Browser Compatibility

Works in all modern browsers and Node.js environments. No transpilation required.

## License

MIT License - feel free to use in your projects!

---
