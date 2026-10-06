<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationCreated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Conversation $conversation,
        public int $createdBy,
    ) {}

    public function broadcastOn(): array
    {
        return $this->conversation->users()
            ->where('users.id', '!=', $this->createdBy)
            ->get(['users.id'])
            ->map(fn ($user) => new PrivateChannel('App.Models.User.'.$user->id))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'conversation.created';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation' => $this->conversation->load('users:id,name')->toArray(),
            'created_by' => $this->createdBy,
        ];
    }
}
