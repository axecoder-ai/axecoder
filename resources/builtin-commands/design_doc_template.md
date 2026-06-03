# Design Document Template

Use the structure below to draft a design document for the current feature or change.

## What to do

1. If `design_doc_template.md` is missing at the project root, create it using the **Template** section below (unless the user specifies another path).
2. If the user provides a feature name or target path (`desired_location`), write a filled-in design document at that path following this structure.
3. Do not implement code. Produce the design document only unless the user asks otherwise.
4. Keep sections concise. Omit sections that do not apply.

## Template

```markdown
# [Feature] Design Document

## Background
- Brief overview of the current system
- Key components and how they relate
- Pain points or gaps to address

## Requirements

### Functional
- Required capabilities
- Expected behavior
- Integration points

### Non-functional
- Performance expectations
- Scalability needs
- Observability requirements
- Security considerations

## Design Decisions

### 1. [Primary decision area]
We will use [approach] because:
- Reason 1
- Reason 2
- Trade-offs considered

### 2. [Another decision area]
We will use [approach] because:
- Reason 1
- Reason 2
- Alternatives considered

## Technical Design
Include when applicable:

### 1. Core Components
```python
# Key interfaces/classes (with type hints)
class MainComponent:
    """Core component documentation"""
    pass
```

### 2. Data Models
```python
# Key data models (with type hints)
class DataModel:
    """Model documentation"""
    pass
```

### 3. Integration Points
- How this connects to other systems
- API contracts
- Data flow diagrams if needed

### 4. File Changes
- List files that will be created or modified.
- These should be the **only** files touched by this change.

## Implementation Plan

1. Phase 1: [Initial implementation]
   - Task 1
   - Task 2
   - Expected timeline

2. Phase 2: [Enhancements]
   - Task 1
   - Task 2
   - Expected timeline

3. Phase 3: [Production readiness]
   - Task 1
   - Task 2
   - Expected timeline

## Testing Strategy

### Unit Tests
- Key cases
- Mocking approach
- Coverage expectations

### Integration Tests
- Scenarios
- Environment requirements
- Data requirements

## Observability

### Logging
- Key log points
- Log levels
- Structured log format

### Metrics
- Metrics to track
- Collection approach
- Alert thresholds

## Future Considerations

### Potential Enhancements
- Future features
- Scalability improvements
- Performance optimizations

### Known Limitations
- Current constraints
- Technical debt
- Areas to revisit

## Dependencies

### Development
- Build tools
- Test frameworks
- Dev utilities

## Security
- Authentication/authorization
- Data protection
- Compliance requirements

## Release Strategy
1. Development
2. Testing
3. Staging
4. Production
5. Post-release monitoring

## References
- Related design docs
- External documentation
- Relevant standards
```

Write in English unless the user asks otherwise.
