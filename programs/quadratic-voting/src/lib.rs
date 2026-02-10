use anchor_lang::prelude::*;

declare_id!("78ncauiBZU5AdQ2SAVwFiDuhUvFmRyuF2Pa6QgwA1B6k");

#[program]
pub mod quadratic_voting {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
