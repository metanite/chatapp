<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        $this->ensureMember($request, $conversation);

        return response()->json(
            $conversation->messages()->with('user:id,name')->latest()->paginate(50),
        );
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->ensureMember($request, $conversation);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $conversation->messages()->create([
            'body' => $data['body'],
            'user_id' => $request->user()->id,
        ])->load('user:id,name');

        broadcast(new MessageSent($message));

        return response()->json($message, 201);
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
