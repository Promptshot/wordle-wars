use anchor_lang::prelude::*;

declare_id!("WordleEscrow111111111111111111111111111111");

#[program]
pub mod wordle_escrow {
    use super::*;

    // Create a new game escrow
    pub fn create_game(ctx: Context<CreateGame>, wager_amount: u64) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        // Initialize game state
        game_account.creator = ctx.accounts.creator.key();
        game_account.wager_amount = wager_amount;
        game_account.status = GameStatus::Waiting;
        game_account.players = [ctx.accounts.creator.key(), Pubkey::default()];
        game_account.winner = Pubkey::default();
        
        // Initialize escrow account
        escrow_account.game = ctx.accounts.game_account.key();
        escrow_account.total_amount = wager_amount;
        escrow_account.creator_deposited = wager_amount;
        escrow_account.opponent_deposited = 0;
        
        msg!("Game created with wager: {} lamports", wager_amount);
        Ok(())
    }

    // Join an existing game
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game_account.players[1] == Pubkey::default(), ErrorCode::GameFull);
        
        // Add player to game
        game_account.players[1] = ctx.accounts.opponent.key();
        game_account.status = GameStatus::Playing;
        
        // Update escrow
        escrow_account.opponent_deposited = game_account.wager_amount;
        escrow_account.total_amount = game_account.wager_amount * 2;
        
        msg!("Player joined game: {}", ctx.accounts.opponent.key());
        Ok(())
    }

    // Settle game - distribute winnings
    pub fn settle_game(ctx: Context<SettleGame>, winner: Pubkey) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Playing, ErrorCode::GameNotPlaying);
        require!(winner == game_account.players[0] || winner == game_account.players[1], ErrorCode::InvalidWinner);
        
        // Update game state
        game_account.winner = winner;
        game_account.status = GameStatus::Completed;
        
        // Transfer winnings to winner
        let winner_account = if winner == game_account.players[0] {
            &ctx.accounts.creator
        } else {
            &ctx.accounts.opponent
        };
        
        **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= escrow_account.total_amount;
        **winner_account.to_account_info().try_borrow_mut_lamports()? += escrow_account.total_amount;
        
        msg!("Game settled! Winner: {}", winner);
        Ok(())
    }

    // Cancel game - refund players
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        
        // Refund creator
        **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= escrow_account.creator_deposited;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += escrow_account.creator_deposited;
        
        game_account.status = GameStatus::Cancelled;
        
        msg!("Game cancelled, refunded: {} lamports", escrow_account.creator_deposited);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + GameAccount::INIT_SPACE
    )]
    pub game_account: Account<'info, GameAccount>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + EscrowAccount::INIT_SPACE
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,
    
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleGame<'info> {
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    /// CHECK: This is the winner account
    pub creator: AccountInfo<'info>,
    
    /// CHECK: This is the opponent account
    pub opponent: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
}

#[account]
#[derive(InitSpace)]
pub struct GameAccount {
    pub creator: Pubkey,
    pub wager_amount: u64,
    pub status: GameStatus,
    pub players: [Pubkey; 2],
    pub winner: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub game: Pubkey,
    pub total_amount: u64,
    pub creator_deposited: u64,
    pub opponent_deposited: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameStatus {
    Waiting,
    Playing,
    Completed,
    Cancelled,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game is not in waiting status")]
    GameNotWaiting,
    #[msg("Game is not in playing status")]
    GameNotPlaying,
    #[msg("Game is full")]
    GameFull,
    #[msg("Invalid winner")]
    InvalidWinner,
}
