# BondFin Azure Deployment Postmortem

Date: 2026-09-08
Repository: `ifabriceshyaka/BondFin`
Final deployed commit: `908eb69`
Final Azure workflow run: [34275645708](https://github.com/ifabriceshyaka/BondFin/actions/runs/34275645708)

## Outcome

The application was successfully built and deployed to Azure Static Web Apps.

The final Azure run reported:

- Build and Deploy Job: successful
- Next.js production build: successful
- Deployment commit: `908eb69`
- Close Pull Request Job: skipped, which is normal for a push to `main`

## Executive Summary

The original runtime error was:

```text
Error: supabaseUrl is required.
```

The immediate cause was that Next.js could not load the Supabase environment variables. The variables were stored in `public/.env.local`, but Next.js loads `.env.local` from the project root. The root environment file was missing, so `process.env.NEXT_PUBLIC_SUPABASE_URL` was undefined when the Supabase client was created.

After the local problem was fixed, Azure exposed several independent workflow configuration problems. The application itself eventually built successfully in Azure. The deployment failures were caused by the workflow configuration and remote secret setup, not by the Next.js application build.

## Error Inventory

### 1. Environment file was in the wrong directory

Severity: Critical

The Supabase variables were initially stored in:

```text
public/.env.local
```

The correct location is:

```text
.env.local
```

The `public` directory is for files served as static web assets. It is not the project configuration directory, and environment files placed there are not loaded by Next.js as application environment variables.

This caused the browser application to import `lib/supabaseClient.ts` with an undefined URL:

```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

The non-null assertion operator (`!`) only silences TypeScript. It does not create a value at runtime or validate the configuration.

Correction:

- Created the ignored root `.env.local`.
- Moved the public Supabase URL and anon key there.
- Removed the duplicate environment file from `public`.

Prevention:

- Keep local environment files at the repository root.
- Keep `.env*` in `.gitignore`.
- Add a committed `.env.example` containing names only, not values.
- Validate required variables at startup with a clear error message.

### 2. Azure did not have the Supabase build secrets

Severity: Critical

The first Azure workflow log showed empty values for:

```text
NEXT_PUBLIC_SUPABASE_URL:
NEXT_PUBLIC_SUPABASE_ANON_KEY:
```

The local `.env.local` file is intentionally ignored and is not present in GitHub Actions. Therefore, Azure cannot use the local file unless its values are added as repository or environment secrets.

This caused Azure's Oryx build to fail while prerendering pages with:

```text
Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

Correction:

- Added `NEXT_PUBLIC_SUPABASE_URL` to the GitHub Actions repository secrets.
- Added `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the GitHub Actions repository secrets.
- Passed both values through the workflow job `env` section.

Prevention:

- Configure all required deployment secrets before the first push.
- Confirm secret names exactly match the names referenced in YAML.
- Never print secret values in logs.
- Add a non-sensitive configuration check that reports whether a variable is missing or malformed without revealing its value.

### 3. The Azure action used an unsupported deployment action value

Severity: Critical

The workflow initially used:

```yaml
action: "deploy"
```

`Azure/static-web-apps-deploy@v1` expects `upload` for a normal deployment. Azure reported:

```text
deployment_action was not provided
```

Correction:

```yaml
action: "upload"
```

The close pull request job correctly continues to use:

```yaml
action: "close"
```

Prevention:

- Start from Azure's generated workflow template.
- Do not rename or invent action values.
- Validate workflow settings against the action documentation before committing.

### 4. The workflow incorrectly declared the repository root as an API directory

Severity: High

The workflow initially used:

```yaml
api_location: "/"
```

This told Azure that the entire repository root was an Azure Functions API directory. The project does not contain a separate Azure Functions API. It is a Next.js application using Supabase directly.

Azure built the application successfully, then rejected the configuration with guidance that `api_location` should be empty for this kind of Next.js application.

Correction:

```yaml
api_location: ""
```

Prevention:

- Use `api_location` only when the repository contains a separate Azure Functions API.
- For a Next.js application without Azure Functions, leave it empty.
- Do not use `/` as a general-purpose placeholder for every workflow path.

### 5. The workflow forced the output location to `.`

Severity: High

The workflow initially used:

```yaml
output_location: "."
```

The Next.js build completed successfully, but Azure then failed while validating the output directory and returned:

```text
An unknown exception has occurred
```

For this SSR Next.js deployment, forcing the repository root as the static output directory was incorrect. Azure's build configuration documentation allows `output_location` to be empty when the normal static output directory does not apply.

Correction:

```yaml
output_location: ""
```

Prevention:

- Distinguish between a static export and a server-rendered Next.js application.
- Do not set `output_location` to `.` simply because the source is at the repository root.
- Use an empty output location when the Azure adapter should handle the framework output.

### 6. A lint error existed in the home page

Severity: Medium

The initial local lint run found:

```text
app/page.tsx: Unexpected any. Specify a different type
```

The state was declared as:

```ts
useState<any[]>([])
```

Correction:

```ts
useState<Record<string, unknown>[]>([])
```

This was not the cause of the original Supabase runtime error, but it would have kept the repository lint check failing.

Prevention:

- Run `npm run lint` before pushing.
- Avoid `any`; define a database row type when the table schema is known.
- Generate Supabase TypeScript types when the project grows.

### 7. The initial development command was entered incorrectly

Severity: Low

The terminal history included:

```text
npm dev run
```

The package script is named `dev`, so the correct command is:

```text
npm run dev
```

This was a command usage error, not an application defect.

Prevention:

- Use the scripts listed in `package.json`.
- Standard commands for this project are:

```text
npm run dev
npm run build
npm run lint
npm start
```

### 8. The global stylesheet import was removed during the work

Severity: Medium, context-dependent

`app/layout.tsx` no longer imports `./globals.css`. This change was already present in the tracked working changes during the deployment work. It did not prevent the final production build or Azure deployment, but it can remove global styles from the application.

This is not an Azure deployment failure. It should be reviewed intentionally rather than treated as a required deployment fix.

Prevention:

- Keep unrelated UI changes separate from deployment fixes.
- Review every tracked file before committing.
- Restore the import if `app/globals.css` contains styles the application still needs.

## Warnings That Did Not Block Deployment

### Dependency security warning

Azure reported:

```text
2 vulnerabilities (1 high, 1 critical)
```

The build still completed, but these vulnerabilities should be investigated. The log also reported that `next@14.2.5` has a known security vulnerability and should be upgraded to a patched release compatible with the application.

Recommended follow-up:

```text
npm audit
npm audit fix
```

Do not use `npm audit fix --force` without reviewing the resulting major-version changes. Run the build and application tests after any dependency upgrade.

### Deprecated package warnings

The build reported that the installed ESLint and Next.js versions are deprecated or have security support concerns. These warnings did not block deployment, but they increase maintenance and security risk.

Recommended follow-up:

- Upgrade Next.js to a supported patched version.
- Align `eslint-config-next` with the selected Next.js version.
- Run `npm install`, `npm run lint`, and `npm run build` after upgrading.
- Review the lockfile diff carefully.

### Node.js version selection

Azure Oryx detected and installed Node.js `22.22.0`. This worked, but the project does not explicitly declare its Node.js version in `package.json`.

Recommended follow-up:

```json
{
  "engines": {
    "node": ">=22 <23"
  }
}
```

Choose the version based on the supported version for the final Next.js dependency set. Pinning or constraining Node reduces differences between local builds and Azure builds.

## Final Workflow Configuration

The deployed workflow uses the important settings below:

```yaml
uses: Azure/static-web-apps-deploy@v1
with:
  action: "upload"
  app_location: "/"
  api_location: ""
  output_location: ""
  app_build_command: "npm run build"
```

The job also supplies:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## Recommended Prevention Checklist

Before the next deployment:

1. Confirm `.env.local` exists at the project root for local work.
2. Confirm `.env.local` is ignored and no environment file is inside `public`.
3. Confirm GitHub repository secrets exist by name.
4. Run `npm run lint` and resolve errors.
5. Run `npm run build` with the same public environment variables used by Azure.
6. Check the Azure workflow paths against the application type.
7. Confirm the deployment action is `upload`.
8. Confirm `api_location` is empty when there is no Azure Functions API.
9. Confirm `output_location` is empty for this SSR Next.js setup.
10. Push and inspect the GitHub Actions run, rather than assuming a successful push means a successful deployment.
11. Review Azure logs for both the Oryx build and the upload phase.
12. Run `npm audit` and schedule dependency upgrades.

## Current Assessment

The deployment configuration is now working. The final Azure run succeeded after these corrections. The remaining technical work is maintenance: review the dependency vulnerabilities, upgrade the outdated Next.js and ESLint packages safely, and decide whether the global stylesheet import should be restored.
