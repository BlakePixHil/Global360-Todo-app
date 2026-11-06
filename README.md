# Todo App

- **Frontend:** Angular 22 with Angular Material, tested with Vitest
- **Backend:** ASP.NET Core Web API on .NET 10 (Minimal APIs), tested with xUnit v3
- **Storage:** in memory, so todos reset whenever the API restarts

## Prerequisites

| Tool | Version |
| --- | --- |
| .NET SDK | 10.0 |
| Node.js | 22.22.3+, 24.15+ or 26+ (required by Angular 22) |
| Visual Studio | 2026 (or any editor plus the `dotnet` CLI) |
| VS Code | Any recent version |

## Running the app

Start the backend first, then the frontend.

### 1. Backend

1. Open `backend/TodoApp.slnx`.
2. Press **F5**. The `https` launch profile starts the API on `https://localhost:7200` and opens the OpenAPI document.
3. If Visual Studio asks to trust the ASP.NET Core development certificate, accept it.

`TodoApp.Api/TodoApp.Api.http` has ready-made requests you can send from Visual Studio.

From a terminal instead:

```bash
cd backend
dotnet run --project TodoApp.Api
```

### 2. Frontend

1. Open the `frontend` folder in VS Code.
2. Run `npm install`.
3. Press **F5** (the `ng serve` launch configuration), or run `npm start`.
4. Browse to `http://localhost:4200`.

The Angular dev server proxies `/api` requests to `https://localhost:7200` (see `frontend/proxy.conf.json`), so no CORS setup is needed and the frontend has no hard-coded backend URL.

## Running the tests

```bash
cd backend
dotnet test
```

```bash
cd frontend
npm test
```

`npm test` watches for changes. Use `npm test -- --watch=false` for a single run.

### Backend

- **Minimal API endpoints** live in `Todos/TodoEndpoints.cs`, grouped under `/api/todos`. Handlers return `TypedResults`.
- **Validation** uses data annotations on `CreateTodoRequest` with the built-in Minimal API validation in .NET 10. Invalid requests get a `400` validation problem before the handler runs.
- **Errors** use Problem Details for unhandled exceptions and empty error responses such as `404`. A request body that cannot be read (malformed JSON or the wrong type) gets a `400`, not a `500`.
- **Storage** sits behind `ITodoRepository`. `InMemoryTodoRepository` is registered as a singleton and is thread safe (`ConcurrentDictionary` plus `Interlocked` for ids). The interface is async even though the in-memory version is not, so a database implementation can be swapped in without changing callers.
- The app is a single project on purpose. With one entity and no business rules, extra layers would add ceremony without adding value.

### Frontend

- `TodoApi` wraps `HttpClient` and is the only place that knows about HTTP. It treats deleting a todo that no longer exists (`404`) as success, because the end result is the same.
- `TodoList` holds the page state in signals (`todos`, `loading`, `saving`, `error`) and uses a typed reactive form whose rules mirror the API's validation.
- The UI uses Angular Material components (card, form field, buttons, icons, progress bar) with a Material 3 theme in `src/styles.scss`. Custom styles only use Material's system variables, so the page follows the system's light or dark mode.
- The add button is disabled and the input is read-only while a todo is saving, so a double submit cannot create duplicates.
- Components use `OnPush` change detection and the app runs without zone.js.

### Testing

- **Backend unit tests** cover the in-memory repository, including concurrent adds.
- **Backend integration tests** use `WebApplicationFactory` to exercise the real HTTP pipeline: status codes, the `Location` header, validation problems at and beyond the length limit, malformed JSON, trimming and `404`s. Each test gets a fresh app, so tests never share data.
- **Frontend tests** check `TodoApi` against `HttpTestingController`, and test `TodoList` through its rendered DOM with a stubbed `TodoApi`.

## Extending the app

- **Real database:** add an `EfCoreTodoRepository` (EF Core with SQL Server, PostgreSQL or SQLite) that implements `ITodoRepository`, register it as scoped instead of the singleton, and add migrations. Endpoints and the frontend stay the same, and the integration tests can run against a real database with Testcontainers.
- **More features:** completing or editing todos means a new field on `TodoItem` and the `Todo` interface, a `PUT` or `PATCH` endpoint in `TodoEndpoints`, and a new method on `TodoApi`.
- **Users:** add ASP.NET Core authentication (for example JWT bearer tokens or Microsoft Entra ID), call `RequireAuthorization()` on the route group, and store a user id on each todo. On the frontend, an HTTP interceptor attaches the token and a route guard protects the page.
- **Growing business logic:** introduce a service between the endpoints and the repository, and split the backend into separate projects (for example Domain, Application, Infrastructure) once there is enough logic to justify it.
- **Growing frontend:** add the Angular router with lazy-loaded feature routes, and move shared state into a signal-based store service when several components need it.
- **Shared contract:** generate the TypeScript client from the API's OpenAPI document (`/openapi/v1.json`) so the frontend types cannot drift from the backend.
- **Deployment:** serve the built Angular app from a static host or the API's `wwwroot`, route `/api` through a reverse proxy (or add a CORS policy), containerise both with Docker, and add health checks, structured logging and OpenTelemetry.
