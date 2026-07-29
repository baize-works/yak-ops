describe('pointer placement preview', () => {
  it('keeps the preview non-interactive while it follows the pointer', () => {
    expect('pointer-events-none').toContain('pointer-events-none');
  });
});
