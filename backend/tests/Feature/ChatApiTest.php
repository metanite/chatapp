<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_create_a_conversation_and_send_a_message(): void
    {
        $registration = $this->postJson('/api/auth/register', [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertCreated();

        $token = $registration->json('token');
        $bob = User::factory()->create(['name' => 'Bob']);

        $this->withToken($token)
            ->getJson('/api/users?search=bob')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Bob');

        $conversation = $this->withToken($token)->postJson('/api/conversations', [
            'user_ids' => [$bob->id],
        ])->assertCreated();

        $conversationId = $conversation->json('id');

        $this->withToken($token)
            ->postJson('/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => "private-conversations.{$conversationId}",
            ])
            ->assertOk();

        $this->withToken($token)
            ->postJson("/api/conversations/{$conversationId}/messages", [
                'body' => 'Hello, Bob!',
            ])
            ->assertCreated()
            ->assertJsonPath('body', 'Hello, Bob!')
            ->assertJsonPath('user.name', 'Alice');

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversationId,
            'user_id' => $registration->json('user.id'),
            'body' => 'Hello, Bob!',
        ]);

        $this->withToken($token)
            ->deleteJson("/api/conversations/{$conversationId}")
            ->assertOk()
            ->assertJsonPath('message', 'Conversation deleted.');

        $this->assertDatabaseMissing('conversations', ['id' => $conversationId]);
        $this->assertDatabaseMissing('messages', ['conversation_id' => $conversationId]);
        $this->assertDatabaseMissing('conversation_user', ['conversation_id' => $conversationId]);
    }
}
