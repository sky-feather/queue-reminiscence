<script lang="ts">
  import { goto } from "$app/navigation";
  import { createOrganization } from "$lib/api";

  const slugPattern = /^[a-z0-9._~-]+$/;

  let name = $state("");
  let slug = $state("");
  let slugTouched = $state(false);
  let error = $state<string | null>(null);
  let busy = $state(false);

  function slugFromName(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._~-]/g, "");
  }

  function onNameInput() {
    if (!slugTouched) slug = slugFromName(name);
  }

  function onSlugInput() {
    slugTouched = true;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;

    error = null;

    if (!slugPattern.test(slug)) {
      error = "Slug must use lowercase letters, numbers, and . _ ~ - only.";
      return;
    }

    busy = true;
    try {
      const result = await createOrganization({ slug, name });
      await goto(`/organizations/${result.organization.id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create organization.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="page">
  <header class="header">
    <div class="header-inner">
      <div>
        <a href="/organizations" class="back-link">← Organizations</a>
        <h1 class="page-title">New organization</h1>
      </div>
    </div>
  </header>

  <main class="content">
    <div class="card">
      {#if error}
        <p class="error">{error}</p>
      {/if}

      <form onsubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            bind:value={name}
            oninput={onNameInput}
            required
            disabled={busy}
            autocomplete="off"
          />
        </label>

        <label>
          Slug
          <span class="hint">Lowercase letters, numbers, and . _ ~ -</span>
          <input
            type="text"
            bind:value={slug}
            oninput={onSlugInput}
            required
            disabled={busy}
            pattern="[-a-z0-9._~]+"
            autocomplete="off"
          />
        </label>

        <div class="actions">
          <button type="submit" class="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create organization"}
          </button>
          <a href="/organizations" class="cancel-link">Cancel</a>
        </div>
      </form>
    </div>
  </main>
</div>

<style>
  .page {
    min-height: 100vh;
  }

  .header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem;
  }

  .header-inner {
    max-width: 720px;
    margin: 0 auto;
  }

  .back-link {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    text-decoration: none;
    display: block;
    margin-bottom: 0.375rem;
  }

  .back-link:hover {
    color: var(--color-text);
    text-decoration: underline;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .content {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .card {
    padding: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-strong);
  }

  .hint {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-text-muted);
  }

  input {
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    width: 100%;
    font-family: inherit;
  }

  input:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.625rem 1rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-link {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: none;
  }

  .cancel-link:hover {
    color: var(--color-text);
    text-decoration: underline;
  }

  .error {
    background: var(--color-error-bg-soft);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-sm);
    color: var(--color-error-text);
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 1rem;
  }
</style>
