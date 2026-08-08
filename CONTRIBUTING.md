# Contributing to ARKIUM AI Desktop Chat

Thank you for your interest in contributing!

## How to Contribute

### Reporting Bugs

Open a GitHub issue with:
- OS and version
- App version
- Steps to reproduce
- Expected vs actual behavior
- Logs from the **Logs** page (export and attach)

### Feature Requests

Open a GitHub issue with:
- Clear description of the feature
- Use case / motivation
- Any mockups or examples

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run lint: `npm run lint`
6. Run type check: `npm run type-check`
7. Commit with a clear message
8. Push and open a Pull Request

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state management
- Tailwind CSS for styling — avoid inline styles
- Use the existing `btn-primary`, `btn-secondary`, `card` component classes
- Format: 2-space indent, single quotes, no semicolons enforced by lint

## Adding Translations

See `src/i18n/locales/en.json` for the full key list.
Copy it to `src/i18n/locales/XX.json` and translate all values.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
