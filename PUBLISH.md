# Publishing to npm

## Steps to Publish

1. **Login to npm** (if not already logged in):
   ```bash
   npm login
   ```

2. **Build the package**:
   ```bash
   npm run build
   ```
   This compiles TypeScript to JavaScript in the `dist/` folder.

3. **Publish to npm**:
   ```bash
   npm publish --access public
   ```

   The package will be published as `@takoviz/ai-sdk` version `1.0.0`.

4. **Verify publication**:
   - Check at: https://www.npmjs.com/package/@takoviz/ai-sdk
   - Test installation: `npm install @takoviz/ai-sdk`

---

## Updating Version

To publish a new version:

1. Update version in `package.json`:
   ```bash
   npm version patch  # For bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # For new features (1.0.0 -> 1.1.0)
   npm version major  # For breaking changes (1.0.0 -> 2.0.0)
   ```

2. Build and publish:
   ```bash
   npm run build
   npm publish --access public
   git push && git push --tags
   ```
