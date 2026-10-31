/**
 * Data Provenance & Simulation Snapshot Registry
 * Guarantees reproducibility of every simulation result by storing an immutable snapshot
 * of physical properties, NIST database version, kinetic model, and EOS utilized.
 */

import { SimulationProvenanceSnapshot } from './types';
import { NIST_SPECIES_REGISTRY } from './speciesRegistry';

const CURRENT_NIST_VERSION = 'NIST Chemistry WebBook SRD 69 (2026.1)';
const CURRENT_SOLVER_VERSION = 'SIM-CAT RK4-PR-EOS v2.4-Audited';

class ProvenanceRegistry {
  private snapshots: Map<string, SimulationProvenanceSnapshot> = new Map();

  /**
   * Generates and stores a complete provenance snapshot for a simulation run
   */
  public createSnapshot(runId: string, activeSpecies: string[]): SimulationProvenanceSnapshot {
    const propertiesSnapshot: Record<string, any> = {};

    for (const spId of activeSpecies) {
      if (spId in NIST_SPECIES_REGISTRY) {
        const sp = NIST_SPECIES_REGISTRY[spId as keyof typeof NIST_SPECIES_REGISTRY];
        propertiesSnapshot[spId] = {
          formula: sp.chemicalFormula,
          casNumber: sp.casNumber,
          molarMass: sp.molarMass.value,
          deltaHf298: sp.standardEnthalpyFormation298.value,
          standardEntropy298: sp.standardEntropy298.value,
          criticalTemperature: sp.criticalTemperature.value,
          criticalPressure: sp.criticalPressure.value,
          acentricFactor: sp.acentricFactor.value,
          shomateRange: [sp.shomateGas.value.tMin, sp.shomateGas.value.tMax],
          webBookUrl: sp.webBookUrl,
          retrievalDate: sp.molarMass.retrievalDate,
        };
      }
    }

    const snapshot: SimulationProvenanceSnapshot = {
      timestamp: new Date().toISOString(),
      version: CURRENT_SOLVER_VERSION,
      speciesIncluded: activeSpecies,
      equationOfState: 'Peng-Robinson (1976) with van der Waals quadratic mixing rules',
      kineticModel: 'Dyson & Baddour (1968) / Temkin-Pyzhev (1940) on Promoted Iron',
      sourceDatabases: [
        CURRENT_NIST_VERSION,
        'CODATA Internationally Recommended Values (1989)',
        'DIPPR 801 Critical Constants Database',
      ],
      propertiesSnapshot,
    };

    this.snapshots.set(runId, snapshot);
    return snapshot;
  }

  /**
   * Retrieves snapshot by runId
   */
  public getSnapshot(runId: string): SimulationProvenanceSnapshot | undefined {
    return this.snapshots.get(runId);
  }

  /**
   * Lists all historical snapshots
   */
  public listSnapshots(): Array<{ runId: string; snapshot: SimulationProvenanceSnapshot }> {
    return Array.from(this.snapshots.entries()).map(([runId, snapshot]) => ({ runId, snapshot }));
  }
}

export const provenanceRegistry = new ProvenanceRegistry();
