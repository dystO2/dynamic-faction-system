import { Button } from "~/components/ui/button";
import useInteractions from "../_hooks/useInteractions";

const Simulator = () => {
  const { triggerFactionInteraction } = useInteractions();

  return (
    <Button
      variant="secondary"
      onClick={() => {
        triggerFactionInteraction();
      }}
    >
      Simulate Consequences
    </Button>
  );
};

export default Simulator;
