<script>
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";

  import { i18n } from "@/js/i18n.js";

  const documentation = [
    "defaultDocumentation1",
    "defaultDocumentation2",
    "defaultDocumentation3",
  ];
  const support = [
    {
      subline: "defaultSupportSubline1",
      items: ["defaultSupport1", "defaultSupport2", "defaultSupport3"],
    },
    {
      subline: "defaultSupportSubline2",
      items: ["defaultSupport4", "defaultSupport5"],
    },
  ];
</script>

{#snippet header()}
  <h1>{$i18n.t("tabHelp")}</h1>
{/snippet}

<Page {header}>
  <div class="content">
    <Section label="defaultDocumentationHead">
      <div class="text">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <p>{@html $i18n.t("defaultDocumentation")}</p>
        <ul class="links">
          {#each documentation as key (key)}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <li>{@html $i18n.t(key)}</li>
          {/each}
        </ul>
      </div>
    </Section>

    <Section label="defaultSupportHead">
      <div class="text">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <p>{@html $i18n.t("defaultSupport")}</p>
        {#each support as group (group.subline)}
          <h3>{$i18n.t(group.subline)}</h3>
          <ul class="links">
            {#each group.items as key (key)}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <li>{@html $i18n.t(key)}</li>
            {/each}
          </ul>
        {/each}
      </div>
    </Section>
  </div>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    align-items: start;
    column-gap: var(--section-gap);
  }

  .text {
    padding: 4px 8px 8px;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--color-text-soft);

    p {
      margin: 0 0 8px;
    }

    h3 {
      margin: 12px 0 4px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
  }

  .links {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      position: relative;
      padding: 6px 0 6px 16px;
      border-top: 1px solid var(--color-border-soft);
    }

    li::before {
      content: "";
      position: absolute;
      left: 2px;
      top: 13px;
      width: 5px;
      height: 5px;
      border-top: 1.5px solid var(--color-text-muted);
      border-right: 1.5px solid var(--color-text-muted);
      transform: rotate(45deg);
    }

    :global(a) {
      color: var(--color-accent-text);
      font-weight: 600;
      text-decoration: none;
    }

    :global(a:hover) {
      text-decoration: underline;
    }
  }

  @media only screen and (max-width: 800px) {
    .content {
      grid-template-columns: 1fr;
    }
  }
</style>
