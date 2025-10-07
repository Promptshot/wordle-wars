use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("2E9mCNwZ2LLHjFpFQUC8K23ARHwhUEoMGq9yZpKWu7VM");

pub const HOUSE_WALLET: &str = "FRG1E6NiJ9UVN4T4v2r9hN1JzqB9r1uPuetCLXuqiRjT";

pub const WINNER_FEE_BPS: u64 = 200;
pub const FORFEIT_FEE_BPS: u64 = 500;

#[program]
pub mod wordle_escrow {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, wager_amount: u64) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(wager_amount > 0, ErrorCode::InvalidWager);
        require!(wager_amount >= 22_000_000, ErrorCode::WagerTooLow);
        
        game_account.creator = ctx.accounts.creator.key();
        game_account.wager_amount = wager_amount;
        game_account.status = GameStatus::Waiting;
        game_account.players = [ctx.accounts.creator.key(), Pubkey::default()];
        game_account.winner = Pubkey::default();
        game_account.created_at = Clock::get()?.unix_timestamp;
        
        escrow_account.game = ctx.accounts.game_account.key();
        escrow_account.total_amount = wager_amount;
        escrow_account.creator_deposited = wager_amount;
        escrow_account.opponent_deposited = 0;
        escrow_account.created_at = Clock::get()?.unix_timestamp;
        
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
        };
        
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        
        system_program::transfer(cpi_context, wager_amount)?;
        
        msg!("Game created with wager: {} lamports", wager_amount);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game_account.players[1] == Pubkey::default(), ErrorCode::GameFull);
        require!(ctx.accounts.opponent.key() != game_account.creator, ErrorCode::CannotJoinOwnGame);
        
        game_account.players[1] = ctx.accounts.opponent.key();
        game_account.status = GameStatus::Playing;
        game_account.started_at = Clock::get()?.unix_timestamp;
        
        escrow_account.opponent_deposited = game_account.wager_amount;
        escrow_account.total_amount = game_account.wager_amount * 2;
        
        let transfer_instruction = system_program::Transfer {
            from: ctx.accounts.opponent.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
        };
        
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        );
        
        system_program::transfer(cpi_context, game_account.wager_amount)?;
        
        msg!("Player joined game: {}", ctx.accounts.opponent.key());
        Ok(())
    }

    pub fn settle_game(ctx: Context<SettleGame>, winner: Pubkey, is_forfeit: bool, both_lost: bool) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Playing, ErrorCode::GameNotPlaying);
        
        game_account.status = GameStatus::Completed;
        game_account.completed_at = Clock::get()?.unix_timestamp;
        
        let total_amount = escrow_account.total_amount;
        let rent = Rent::get()?;
        let min_rent = rent.minimum_balance(ctx.accounts.escrow_account.to_account_info().data_len());
        
        let escrow_info = ctx.accounts.escrow_account.to_account_info();
        let house_info = ctx.accounts.house_wallet.to_account_info();
        
        if both_lost {
            game_account.winner = Pubkey::default();
            
            let available_amount = total_amount.saturating_sub(min_rent);
            
            **escrow_info.try_borrow_mut_lamports()? -= available_amount;
            **house_info.try_borrow_mut_lamports()? += available_amount;
            
            msg!("Both players lost! House gets {} lamports", available_amount);
        } else {
            require!(winner == game_account.players[0] || winner == game_account.players[1], ErrorCode::InvalidWinner);
            game_account.winner = winner;
            
            let fee_bps = if is_forfeit { FORFEIT_FEE_BPS } else { WINNER_FEE_BPS };
            
            let available_amount = total_amount.saturating_sub(min_rent);
            let actual_fee = (available_amount * fee_bps) / 10000;
            let actual_winner_amount = available_amount - actual_fee;
            
            let winner_account = if winner == game_account.players[0] {
                &ctx.accounts.creator
            } else {
                &ctx.accounts.opponent
            };
            let winner_info = winner_account.to_account_info();
            
            **escrow_info.try_borrow_mut_lamports()? -= actual_fee;
            **house_info.try_borrow_mut_lamports()? += actual_fee;
            
            **escrow_info.try_borrow_mut_lamports()? -= actual_winner_amount;
            **winner_info.try_borrow_mut_lamports()? += actual_winner_amount;
            
            msg!("Game settled! Winner: {} gets {} lamports, House fee: {} lamports", winner, actual_winner_amount, actual_fee);
        }
        
        Ok(())
    }

    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(ctx.accounts.creator.key() == game_account.creator, ErrorCode::Unauthorized);
        
        let refund_amount = escrow_account.creator_deposited;
        let escrow_info = ctx.accounts.escrow_account.to_account_info();
        let game_info = ctx.accounts.game_account.to_account_info();
        let creator_info = ctx.accounts.creator.to_account_info();
        
        // Calculate total refund including all lamports in both accounts
        // This includes the wager + rent reserves from both game and escrow accounts
        let escrow_lamports = escrow_info.lamports();
        let game_lamports = game_info.lamports();
        let total_refund = escrow_lamports + game_lamports;
        
        // Transfer all lamports from both accounts to creator
        **escrow_info.try_borrow_mut_lamports()? = 0;
        **game_info.try_borrow_mut_lamports()? = 0;
        **creator_info.try_borrow_mut_lamports()? += total_refund;
        
        msg!("Game cancelled, total refunded (including rent): {} lamports", total_refund);
        Ok(())
    }
    
    pub fn forfeit_game(ctx: Context<ForfeitGame>, forfeiter: Pubkey) -> Result<()> {
        let game_account = &mut ctx.accounts.game_account;
        let escrow_account = &mut ctx.accounts.escrow_account;
        
        require!(game_account.status == GameStatus::Playing, ErrorCode::GameNotPlaying);
        require!(forfeiter == game_account.players[0] || forfeiter == game_account.players[1], ErrorCode::InvalidWinner);
        
        let winner = if forfeiter == game_account.players[0] {
            game_account.players[1]
        } else {
            game_account.players[0]
        };
        
        game_account.winner = winner;
        game_account.status = GameStatus::Completed;
        game_account.completed_at = Clock::get()?.unix_timestamp;
        
        let total_amount = escrow_account.total_amount;
        let rent = Rent::get()?;
        let min_rent = rent.minimum_balance(ctx.accounts.escrow_account.to_account_info().data_len());
        
        let escrow_info = ctx.accounts.escrow_account.to_account_info();
        let house_info = ctx.accounts.house_wallet.to_account_info();
        
        let available_amount = total_amount.saturating_sub(min_rent);
        let fee_amount = (available_amount * FORFEIT_FEE_BPS) / 10000;
        let winner_amount = available_amount - fee_amount;
        
        let winner_account = if winner == game_account.players[0] {
            &ctx.accounts.creator
        } else {
            &ctx.accounts.opponent
        };
        let winner_info = winner_account.to_account_info();
        
        **escrow_info.try_borrow_mut_lamports()? -= fee_amount;
        **house_info.try_borrow_mut_lamports()? += fee_amount;
        
        **escrow_info.try_borrow_mut_lamports()? -= winner_amount;
        **winner_info.try_borrow_mut_lamports()? += winner_amount;
        
        msg!("Game forfeited! Winner: {} gets {} lamports, House fee: {} lamports", winner, winner_amount, fee_amount);
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
    
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    #[account(mut)]
    pub opponent: AccountInfo<'info>,
    
    #[account(mut)]
    pub house_wallet: AccountInfo<'info>,
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

#[derive(Accounts)]
pub struct ForfeitGame<'info> {
    #[account(mut)]
    pub game_account: Account<'info, GameAccount>,
    
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    
    #[account(mut)]
    pub opponent: AccountInfo<'info>,
    
    #[account(mut)]
    pub house_wallet: AccountInfo<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct GameAccount {
    pub creator: Pubkey,
    pub wager_amount: u64,
    pub status: GameStatus,
    pub players: [Pubkey; 2],
    pub winner: Pubkey,
    pub created_at: i64,
    pub started_at: i64,
    pub completed_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub game: Pubkey,
    pub total_amount: u64,
    pub creator_deposited: u64,
    pub opponent_deposited: u64,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
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
    #[msg("Invalid wager amount")]
    InvalidWager,
    #[msg("Wager amount too low")]
    WagerTooLow,
    #[msg("Cannot join your own game")]
    CannotJoinOwnGame,
    #[msg("Unauthorized action")]
    Unauthorized,
}

