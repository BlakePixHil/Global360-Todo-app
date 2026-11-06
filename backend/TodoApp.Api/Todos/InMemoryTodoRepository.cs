using System.Collections.Concurrent;

namespace TodoApp.Api.Todos;

public sealed class InMemoryTodoRepository : ITodoRepository
{
    private readonly ConcurrentDictionary<int, TodoItem> _items = new();
    private int _lastId;

    public Task<IReadOnlyList<TodoItem>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<TodoItem> items = [.. _items.Values.OrderBy(item => item.Id)];
        return Task.FromResult(items);
    }

    public Task<TodoItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_items.GetValueOrDefault(id));

    public Task<TodoItem> AddAsync(string title, CancellationToken cancellationToken = default)
    {
        var item = new TodoItem(Interlocked.Increment(ref _lastId), title);
        _items[item.Id] = item;
        return Task.FromResult(item);
    }

    public Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_items.TryRemove(id, out _));
}
