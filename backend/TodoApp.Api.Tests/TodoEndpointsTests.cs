using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using TodoApp.Api.Todos;

namespace TodoApp.Api.Tests;

public sealed class TodoEndpointsTests : IAsyncDisposable
{
    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly HttpClient _client;

    public TodoEndpointsTests() => _client = _factory.CreateClient();

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GetAll_WhenNoTodosExist_ReturnsEmptyList()
    {
        var todos = await _client.GetFromJsonAsync<List<TodoItem>>("/api/todos", CancellationToken);

        Assert.NotNull(todos);
        Assert.Empty(todos);
    }

    [Fact]
    public async Task Create_WithValidTitle_ReturnsCreatedTodoWithTrimmedTitle()
    {
        var response = await _client.PostAsJsonAsync("/api/todos", new { title = "  Buy milk  " }, CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var todo = await response.Content.ReadFromJsonAsync<TodoItem>(CancellationToken);
        Assert.NotNull(todo);
        Assert.Equal("Buy milk", todo.Title);
        Assert.Equal($"/api/todos/{todo.Id}", response.Headers.Location?.AbsolutePath);
    }

    [Fact]
    public async Task Create_ThenGetAll_ReturnsTheNewTodo()
    {
        var created = await CreateTodoAsync("Buy milk");

        var todos = await _client.GetFromJsonAsync<List<TodoItem>>("/api/todos", CancellationToken);

        Assert.Equal([created], todos);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_WithBlankTitle_ReturnsValidationProblem(string? title)
    {
        var response = await _client.PostAsJsonAsync("/api/todos", new { title }, CancellationToken);

        await AssertTitleValidationProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithTitleLongerThanMaxLength_ReturnsValidationProblem()
    {
        var title = new string('a', CreateTodoRequest.TitleMaxLength + 1);

        var response = await _client.PostAsJsonAsync("/api/todos", new { title }, CancellationToken);

        await AssertTitleValidationProblemAsync(response);
    }

    [Fact]
    public async Task Create_WithTitleAtMaxLength_ReturnsCreated()
    {
        var title = new string('a', CreateTodoRequest.TitleMaxLength);

        var response = await _client.PostAsJsonAsync("/api/todos", new { title }, CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("{\"title\":")]
    [InlineData("{\"title\":5}")]
    public async Task Create_WithMalformedBody_ReturnsBadRequestProblem(string body)
    {
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/todos", content, CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task GetById_ExistingTodo_ReturnsIt()
    {
        var created = await CreateTodoAsync("Buy milk");

        var todo = await _client.GetFromJsonAsync<TodoItem>($"/api/todos/{created.Id}", CancellationToken);

        Assert.Equal(created, todo);
    }

    [Fact]
    public async Task GetById_UnknownTodo_ReturnsNotFoundProblem()
    {
        var response = await _client.GetAsync("/api/todos/42", CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Delete_ExistingTodo_ReturnsNoContentAndRemovesIt()
    {
        var keep = await CreateTodoAsync("Keep");
        var remove = await CreateTodoAsync("Remove");

        var response = await _client.DeleteAsync($"/api/todos/{remove.Id}", CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var todos = await _client.GetFromJsonAsync<List<TodoItem>>("/api/todos", CancellationToken);
        Assert.Equal([keep], todos);
    }

    [Fact]
    public async Task Delete_UnknownTodo_ReturnsNotFound()
    {
        var response = await _client.DeleteAsync("/api/todos/42", CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task<TodoItem> CreateTodoAsync(string title)
    {
        var response = await _client.PostAsJsonAsync("/api/todos", new { title }, CancellationToken);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TodoItem>(CancellationToken))!;
    }

    private static async Task AssertTitleValidationProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>(CancellationToken);
        Assert.NotNull(problem);
        Assert.Contains("Title", problem.Errors.Keys);
    }
}
