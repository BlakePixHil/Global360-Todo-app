using Microsoft.AspNetCore.Http.HttpResults;

namespace TodoApp.Api.Todos;

public static class TodoEndpoints
{
    private const string GetTodoRouteName = "GetTodo";

    public static IEndpointRouteBuilder MapTodoEndpoints(this IEndpointRouteBuilder app)
    {
        var todos = app.MapGroup("/api/todos").WithTags("Todos");

        todos.MapGet("/", GetAll);
        todos.MapGet("/{id:int}", GetById).WithName(GetTodoRouteName);
        todos.MapPost("/", Create).ProducesValidationProblem();
        todos.MapDelete("/{id:int}", Delete);

        return app;
    }

    private static async Task<Ok<IReadOnlyList<TodoItem>>> GetAll(
        ITodoRepository repository, CancellationToken cancellationToken) =>
        TypedResults.Ok(await repository.GetAllAsync(cancellationToken));

    private static async Task<Results<Ok<TodoItem>, NotFound>> GetById(
        int id, ITodoRepository repository, CancellationToken cancellationToken) =>
        await repository.GetByIdAsync(id, cancellationToken) is { } todo
            ? TypedResults.Ok(todo)
            : TypedResults.NotFound();

    private static async Task<CreatedAtRoute<TodoItem>> Create(
        CreateTodoRequest request, ITodoRepository repository, CancellationToken cancellationToken)
    {
        var todo = await repository.AddAsync(request.Title.Trim(), cancellationToken);
        return TypedResults.CreatedAtRoute(todo, GetTodoRouteName, new { id = todo.Id });
    }

    private static async Task<Results<NoContent, NotFound>> Delete(
        int id, ITodoRepository repository, CancellationToken cancellationToken) =>
        await repository.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
}
