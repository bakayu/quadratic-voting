use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("78ncauiBZU5AdQ2SAVwFiDuhUvFmRyuF2Pa6QgwA1B6k");

#[program]
pub mod quadratic_voting {
    use super::*;

    pub fn init_dao(ctx: Context<InitDao>, name: String) -> Result<()> {
        instructions::init_dao(ctx, name)
    }

    pub fn init_proposal(ctx: Context<InitProposalContext>, metadata: String) -> Result<()> {
        instructions::init_proposal(ctx, metadata)
    }

    pub fn cast_vote(ctx: Context<CastVote>, vote_type: u8) -> Result<()> {
        instructions::cast_vote(ctx, vote_type)
    }
}
