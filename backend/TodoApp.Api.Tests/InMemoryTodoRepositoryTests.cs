using TodoApp.Api.Todos;

namespace TodoApp.Api.Tests;

public sealed class InMemoryTodoRepositoryTests
{
    private readonly InMemoryTodoRepository _repository = new();

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GetAllAsync_WhenEmpty_ReturnsEmptyList()
    {
        var todos = await _repository.GetAllAsync(CancellationToken);

        Assert.Empty(todos);
    }

    [Fact]
    public async Task AddAsync_ReturnsTodoWithNextId()
    {
        var first = await _repository.AddAsync("First", CancellationToken);
        var second = await _repository.AddAsync("Second", CancellationToken);

        Assert.Equal(new TodoItem(1, "First"), first);
        Assert.Equal(new TodoItem(2, "Second"), second);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsTodosInTheOrderTheyWereAdded()
    {
        await _repository.AddAsync("First", CancellationToken);
        await _repository.AddAsync("Second", CancellationToken);
        await _repository.AddAsync("Third", CancellationToken);

        var todos = await _repository.GetAllAsync(CancellationToken);

        Assert.Equal(["First", "Second", "Third"], todos.Select(todo => todo.Title));
    }

    [Fact]
    public async Task GetByIdAsync_ExistingTodo_ReturnsIt()
    {
        var added = await _repository.AddAsync("Buy milk", CancellationToken);

        var todo = await _repository.GetByIdAsync(added.Id, CancellationToken);

        Assert.Equal(added, todo);
    }

    [Fact]
    public async Task GetByIdAsync_UnknownId_ReturnsNull()
    {
        var todo = await _repository.GetByIdAsync(42, CancellationToken);

        Assert.Null(todo);
    }

    [Fact]
    public async Task DeleteAsync_ExistingTodo_RemovesItAndReturnsTrue()
    {
        var keep = await _repository.AddAsync("Keep", CancellationToken);
        var remove = await _repository.AddAsync("Remove", CancellationToken);

        var deleted = await _repository.DeleteAsync(remove.Id, CancellationToken);

        Assert.True(deleted);
        Assert.Equal([keep], await _repository.GetAllAsync(CancellationToken));
    }

    [Fact]
    public async Task DeleteAsync_UnknownId_ReturnsFalse()
    {
        var deleted = await _repository.DeleteAsync(42, CancellationToken);

        Assert.False(deleted);
    }

    [Fact]
    public async Task AddAsync_CalledConcurrently_AssignsUniqueIds()
    {
        await Task.WhenAll(Enumerable.Range(0, 100)
            .Select(i => Task.Run(() => _repository.AddAsync($"Todo {i}", CancellationToken), CancellationToken)));

        var todos = await _repository.GetAllAsync(CancellationToken);

        Assert.Equal(Enumerable.Range(1, 100), todos.Select(todo => todo.Id));
    }
}
