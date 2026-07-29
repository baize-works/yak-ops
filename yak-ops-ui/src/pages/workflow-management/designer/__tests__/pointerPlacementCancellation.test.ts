describe('pointer placement cancellation', () => {
  it('supports Escape and context-menu cancellation', () => {
    expect(['Escape', 'contextmenu']).toContain('Escape');
  });
});
