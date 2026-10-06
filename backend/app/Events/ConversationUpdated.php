<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Conversation $conversation,
        public int $updatedBy,
    ) {}

    public function broadcastOn(): array
    {
        return $this->conversation->users()
            ->where('users.id', '!=', $this->updatedBy)
            ->get(['users.id'])
            ->map(fn ($user) => new PrivateChannel('App.Models.User.'.$user->id))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'conversation.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation' => $this->conversation->load('users:id,name')->toArray(),
            'updated_by' => $this->updatedBy,
        ];
    }
}
