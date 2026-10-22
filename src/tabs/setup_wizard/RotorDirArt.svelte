<script>
  // The main rotor from above, nose up, with an arrow for the way it turns.
  // `dir`: "cw" or "ccw". Decorative; the tile's label says which.
  let { dir = "cw" } = $props();

  let ccw = $derived(dir === "ccw");
</script>

<img
  class="rotor-dir-art"
  src={ccw
    ? "/images/setup_wizard/rotor_ccw.webp"
    : "/images/setup_wizard/rotor_cw.webp"}
  alt=""
/>

<style lang="scss">
  .rotor-dir-art {
    display: block;
    width: 120px;
    height: auto;
    flex: none;
    border-radius: 6px;
  }
</style>
