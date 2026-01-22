<script>
  import { i18n } from "@/js/i18n.js";

  let { children, onclose, onconfirm, label } = $props();
</script>

<div class="modal-wrapper">
  <div class="background" onclick={() => onclose?.()}></div>
  <div class="modal">
    <div class="header">
      <span class="title">
        {#if typeof label === "function"}
          {@render label()}
        {:else}
          {$i18n.t(label)}
        {/if}
      </span>
    </div>
    <div class="content">
      {@render children?.()}
    </div>
    <div class="footer">
      <button onclick={() => onclose?.()}>Cancel</button>
      <button onclick={() => onconfirm?.()}>OK</button>
    </div>
  </div>
</div>

<style lang="scss">
  .modal-wrapper {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    z-index: 20000;
    padding: 24px;
  }

  .background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .header {
    @extend %section-header;

    button {
      @extend %button;
      background: none;
      border: none;
    }
  }

  .title {
    padding-left: 8px;
  }

  .modal {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: fit-content;
    display: flex;
    flex-direction: column;
  }

  .content {
    padding: 4px;
    overflow: hidden;
    background-color: var(--color-surface);
  }

  .footer {
    border-top: 1px solid var(--color-border-soft);
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    background-color: var(--color-surface);

    overflow: hidden;
    display: flex;

    * {
      flex-grow: 1;
    }

    * + * {
      border-left: 1px solid var(--color-border-soft);
    }

    button {
      border: none;
      border-radius: 0;
      padding: 12px 8px;
      transition: var(--animation-speed);

      color: var(--color-flat-btn-fg);
      background-color: var(--color-flat-btn-bg);

      &:disabled {
        cursor: not-allowed;
        color: var(--color-btn-fg-disabled);
        background-color: var(--color-btn-bg-disabled);
      }

      @media (hover: hover) {
        &:hover {
          background-color: var(--color-flat-btn-bg-hover);
        }
      }

      &:active {
        background-color: var(--color-flat-btn-bg-active);
      }
    }

    button + button {
      border-left: 1px solid var(--color-border-soft);
    }
  }

  @media only screen and (max-width: 480px) {
    .modal-wrapper {
      padding: 0;
    }

    .modal {
      height: 100%;
    }

    .footer {
      border-radius: 0;
    }

    .background {
      background-color: var(--color-bg);
    }

    .content {
      flex-grow: 1;
    }
  }
</style>
