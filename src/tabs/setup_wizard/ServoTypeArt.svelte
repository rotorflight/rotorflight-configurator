<script>
  // A servo type's picture as the Ethos wizard draws it
  // (app/gfx/setup_wizard/servo-<group>-<type>.png): the type's signal above
  // the servo. Decorative; the caption beside it gives the name and values.
  import PulseTrain from "./PulseTrain.svelte";
  import ServoArt from "./ServoArt.svelte";

  let { rate, width } = $props();
</script>

<div class="servo-type-art" aria-hidden="true">
  <PulseTrain {rate} {width} />
  <ServoArt />
</div>

<style lang="scss">
  .servo-type-art {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 140px;
  }
</style>
