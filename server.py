import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from simcat_engine import ReactorParameters, compute_simcat_assessment

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/health": {"origins": "*"}, r"/": {"origins": "*"}}, supports_credentials=True)
application = app

@app.route("/", methods=["GET"])
def api_root():
    return jsonify({
        "service": "Sim-Cat Reaction Kinetics Backend API",
        "status": "online",
        "platform": "Render Python Web Service",
        "frontend": "Hosted separately on Vercel",
        "endpoints": {
            "health": "GET /health",
            "assess": "POST /api/assess"
        }
    }), 200

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Sim-Cat Reaction Kinetics Suite API",
        "backend": "Python / Flask on Render",
        "version": "1.0.0"
    }), 200

@app.route("/api/assess", methods=["POST", "OPTIONS"])
def assess_endpoint():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json(force=True) or {}
        params = ReactorParameters(
            temperature=float(data.get("temperature", 550.0)),
            total_pressure=float(data.get("totalPressure", data.get("total_pressure", 250000.0))),
            feed_flow=float(data.get("feedFlow", data.get("feed_flow", 1.2e-6))),
            bed_height=float(data.get("bedHeight", data.get("bed_height", 0.03))),
            tube_diameter=float(data.get("tubeDiameter", data.get("tube_diameter", 0.008))),
            particle_diameter=float(data.get("particleDiameter", data.get("particle_diameter", 0.0005))),
            bed_porosity=float(data.get("bedPorosity", data.get("bed_porosity", 0.40))),
            catalyst_density=float(data.get("catalystDensity", data.get("catalyst_density", 1500.0))),
            catalyst_mass=float(data.get("catalystMass", data.get("catalyst_mass", 0.00005))),
            catalyst_thermal_cond=float(data.get("catalystThermalCond", data.get("catalyst_thermal_cond", 0.35))),
            inert_mass=float(data.get("inertMass", data.get("inert_mass", 0.00015))),
            inert_density=float(data.get("inertDensity", data.get("inert_density", 3200.0))),
            inert_thermal_cond=float(data.get("inertThermalCond", data.get("inert_thermal_cond", 20.0))),
            diluted_conversion=float(data.get("dilutedConversion", data.get("diluted_conversion", 0.50))),
            reaction_rate=float(data.get("reactionRate", data.get("reaction_rate", 1.0e-4))),
            reaction_order=float(data.get("reactionOrder", data.get("reaction_order", 1.0))),
            activation_energy=float(data.get("activationEnergy", data.get("activation_energy", 150000.0))),
            reaction_enthalpy=float(data.get("reactionEnthalpy", data.get("reaction_enthalpy", 81500.0))),
            conversion=float(data.get("conversion", 0.50)),
            reactant_mole_fraction=float(data.get("reactantMoleFraction", data.get("reactant_mole_fraction", 0.0004))),
            gas_molecular_weight=float(data.get("gasMolecularWeight", data.get("gas_molecular_weight", 0.004))),
            gas_viscosity=float(data.get("gasViscosity", data.get("gas_viscosity", 2.8e-5))),
            gas_heat_capacity=float(data.get("gasHeatCapacity", data.get("gas_heat_capacity", 5190.0))),
            gas_conductivity=float(data.get("gasConductivity", data.get("gas_conductivity", 0.25))),
            effective_diffusivity=float(data.get("effectiveDiffusivity", data.get("effective_diffusivity", 8.0e-7))),
            molecular_diffusivity=float(data.get("molecularDiffusivity", data.get("molecular_diffusivity", 1.2e-5)))
        )
        result = compute_simcat_assessment(params)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found on Render Python backend. The frontend application is hosted on Vercel.",
        "valid_endpoints": ["/", "/health", "/api/assess"]
    }), 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
