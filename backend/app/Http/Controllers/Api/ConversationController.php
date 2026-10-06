<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $conversations = $request->user()
            ->conversations()
            ->with('users:id,name')
            ->withCount('messages')
            ->latest('conversations.updated_at')
            ->paginate(20);

        return response()->json($conversations);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        $userIds = collect($data['user_ids'])
            ->push($request->user()->id)
            ->unique()
            ->values();

        $conversation = Conversation::create([
            'title' => $data['title'] ?? null,
        ]);
        $conversation->users()->sync($userIds);

        return response()->json(
            $conversation->load('users:id,name'),
            201,
        );
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->ensureMember($request, $conversation);

        return response()->json(
            $conversation->load([
                'users:id,name',
                'messages' => fn ($query) => $query->latest()->limit(50),
                'messages.user:id,name',
            ]),
        );
    }

    private function ensureMember(Request $request, Conversation $conversation): void
    {
        abort_unless(
            $conversation->users()->whereKey($request->user()->id)->exists(),
            403,
            'You are not a member of this conversation.',
        );
    }
}
