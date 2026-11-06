using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.Todos;

public sealed record CreateTodoRequest(
    [property: Required, MaxLength(CreateTodoRequest.TitleMaxLength)] string Title)
{
    public const int TitleMaxLength = 200;
}
