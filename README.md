# Wind Ups

## Site description and goal
Winds Ups is a discussion forum that aim to celebrate differences in personalities, perspectives and opinions through light-hearted, respectful debate. 

### How is Wind Ups different from other sites such as reddit
Wind Ups rewards creating engaging content that breeds discourse and conversation. Users can respond to author's posts with an agree/disagree meter that reflects how much one aligns with the 'take' made. Authors can aim to please the crowd and strive for a high 'agreement factor' at the risk of making a 'grass is green' statement. On the other hand authors can choose to create funny/absurd takes in the aim to 'wind up' other users. This will earn the 'ragebaiter' achievement 

## Project Structure

Astro project with SSR enabled.

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

## Technology Stack

- **Application:** Astro with server-side rendering, served by the standalone
  `@astrojs/node` adapter in a Node.js runtime.
- **Language and content:** TypeScript, Astro components, and MDX for authored
  content.
- **Styling and assets:** Sass, locally hosted fonts, and `sharp` for image
  processing.
- **Authentication and backend:** Supabase JavaScript client with
  `@supabase/ssr` for server-side authentication flows.
- **Deployment:** A multi-stage Docker image runs the Astro Node server.
  AWS CDK written with, TypeScript, defines an ECS Fargate deployment behind an Application
  Load Balancer using an image from ECR
- **Quality checks:** ESLint, Astro check, Vitest unit tests

## Commands

All commands are run from the root of the project, from a terminal:

| Command                                                           | Action                                           |
| :---------------------------------------------------------------- | :----------------------------------------------- |
| `npm install`                                                     | Installs dependencies                            |
| `npm run dev`                                                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                                                   | Build your production site to `./dist/`          |
| `npm run preview`                                                 | Preview your build locally, before deploying     |
| `npm run test:integration`                                        | Runs auth integration tests against local Supabase |
| `npm run astro ...`                                               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`                                         | Get help using the Astro CLI                     |
| `docker build -t <image-name> .`                                  | Build a production Docker image                   |
| `docker run -d -p 4321:4321 --env-file .env.local -e SUPABASE_URL=http://host.docker.internal:54321 --name <container-name> <image-name>` | Run the image against local Supabase |

The integration tests load `.env.local` when it exists, log `SITE_URL` and `SUPABASE_URL`, and refuse to run against a non-local Supabase host. They verify database access and create then remove a temporary auth user.

### Docker development with a fresh local database

The application image connects to Supabase; it does not contain the database or Supabase Auth/API services. Start a fresh local Supabase database with the project migrations and seed data before running the app:

```sh
npx supabase start
npx supabase db reset
docker build -t wind-ups .
docker run -d -p 4321:4321 --env-file .env.local -e SUPABASE_URL=http://host.docker.internal:54321 --name wind-ups wind-ups
```

Set `SUPABASE_PUBLISHABLE_KEY` in `.env.local` to the local publishable key (or legacy anon key) reported by `npx supabase status`. The Dockerfile defaults `SUPABASE_URL` to the local Supabase API; the `-e` option overrides it explicitly for this run. Environment variables passed at runtime override Dockerfile defaults, so deployments can provide their own Supabase URL and key without embedding credentials in the image.


## Supabase sign-up configuration

Set these environment variables for local development and deployment:

- `SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_PUBLISHABLE_KEY`: the project's publishable (or legacy anon) key. Do not use a `service_role` or secret key here.
- `SITE_URL`: the public base URL of this application, such as `http://localhost:4321` locally or the production HTTPS origin.

Allow the `/auth/confirm` URL under **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard. Because the callback verifies `token_hash`, configure the **Confirm signup** email template to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email`. Custom SMTP need for this WIP.
