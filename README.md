# Sim-Cat
### Gas-Solid Fixed-Bed Diagnostic Suite for Reaction Kinetics

Sim-Cat is an industrial and laboratory simulation platform for assessing transport limitations in catalytic fixed-bed reactors. 

> Eurokin's documentations have been used to develop this prototype.

Designed with rigorous engineering standards: serious, intuitive, zero-AI-slop, featuring interactive 2D bed cross-section graphics, live mathematical formula derivations, and parametric sensitivity sweeps.

---

## 1. Purpose and Core Capabilities

When measuring catalytic reaction rates in laboratory and pilot fixed beds, observed kinetics often deviate from true intrinsic kinetics due to transport resistances:
- Axial and radial flow dispersion (non-ideal plug flow and bypass channeling)
- External gas-film boundary layer mass transfer limitations
- Internal intraparticle pore diffusion limitations (Thiele modulus and Weisz-Prater criterion)
- External gas-film temperature jumps and intraparticle temperature gradients
- Radial bed temperature gradients from centerline to tube wall (Mears criteria)
- Excessive inert bed dilution causing conversion maldistribution (Berger criterion)
- Excessive bed pressure drop violating isobaric operation (Ergun equation)

Sim-Cat assesses all 9 core criteria simultaneously, requiring all transport perturbations to cause less than 5% error on the reaction rate (< 5% tolerance threshold) for true intrinsic kinetic validity.

---

## 2. The 9 Diagnostic Criteria

| Number | Diagnostic Criterion | Category | Governing Formula | Literature Reference |
|---|----------------------|----------|-------------------|----------------------|
| 1 | Axial Dispersion | Fluid Dynamics | $\frac{h_{\text{bed}}}{d_p} > \frac{8}{Bo} \, n \ln\left(\frac{1}{1-X_A}\right)$ | Mears (1971), Gierman (1988), Wakao (1979) |
| 2 | Radial Dispersion | Fluid Dynamics | $\frac{d_t}{d_p} > 8.0$ | Chu & Ng (1989) |
| 3 | External Mass Transfer | Mass Transfer | $Ca = \frac{R_{v,A}^{\text{obs}}}{k_g \, a_v \, C_{A,b}} < \frac{0.05}{n}$ | Mears (1971), Wakao et al. (1979) |
| 4 | Internal Pore Diffusion | Mass Transfer | $\Phi = \frac{n+1}{2}\frac{R_{v,A}^{\text{obs}}(d_p/6)^2}{D_{A,\text{eff}} C_{A,s}} < 0.08$ | Froment & Bischoff (1990), Anderson & Pratt (1985) |
| 5 | External Film Heat Transfer | Heat Transfer | $\Delta T_{\text{film}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p}{6 \alpha_p} < \frac{0.05 R T_G^2}{E_a}$ | Mears (1971), Wakao et al. (1979) |
| 6 | Radial Bed Heat Transfer | Heat Transfer | $\Delta T_{\text{rad}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\|(1-\varepsilon_b)(1-b) d_t^2}{32 \lambda_{\text{er}}} < \frac{0.05 R T_w^2}{E_a}$ | Mears (1971), Specchia et al. (1980) |
| 7 | Intraparticle Conduction | Heat Transfer | $\Delta T_{\text{int}} = \frac{R_{v,A}^{\text{obs}} \|\Delta_r H\| d_p^2}{60 \lambda_p} < \frac{0.05 R T^2}{E_a}$ | Mears (1971) |
| 8 | Relative Pressure Drop | Hydrodynamics | $\Delta P = \frac{f_m \rho_G u_0^2 h_{\text{bed}}}{d_p} < \frac{0.2 P_{\text{tot}}}{n}$ | Ergun (1952) |
| 9 | Inert Bed Dilution | Bed Homogeneity | $\Delta = \left(\frac{b}{1-b}\right)\frac{X_{\text{dil}} d_p}{2 h_{\text{bed}}} < 0.05$ | Berger et al. (2002) |

---

## 3. Environment Configurations

Sim-Cat provides separate environment configuration templates for local development and cloud hosting (e.g. Render).

### Environment Files
- `.env.template`: Production and cloud deployment blueprint template.
- `.env.example`: Reference copy for developers setting up alternative environments.
- `.env.local`: Local developer overrides (strictly git-ignored).

### Key Variables
```ini
# Application Metadata
VITE_APP_NAME="Sim-Cat"
VITE_APP_VERSION="1.0.0"

# Server and Port (Render uses 10000 by default, local dev uses 5173)
PORT=10000
HOST="0.0.0.0"

# Simulation Parameters
VITE_DEFAULT_PRESET="benchmark_n2o"
VITE_ENABLE_ANALYTICS="false"
VITE_MAX_SWEEP_STEPS="50"
```

### Git Security Policy
The project `.gitignore` file enforces that:
- `.env`, `.env.local`, and `.env.*.local` are never tracked by version control.
- `.env.template` and `.env.example` are tracked to maintain clear configuration schemas.

---

## 4. Deployment on Render

Render automatically detects the repository as a Python Web Service. The repository includes `requirements.txt`, `app.py`, `server.py`, and pre-compiled frontend assets in `dist/`.

### Render Service Settings
- **Environment**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn your_application.wsgi` (or `gunicorn app:app` / `python server.py`)
- **Port**: `10000` (automatically provided by Render `$PORT`)

### Optional Build Script
If you wish to rebuild the frontend assets on Render directly, you can set the Build Command to:
```bash
./render-build.sh
```
This executes `pip install -r requirements.txt` followed by `npm install && npm run build`.

---

## 5. Local Development

### 1. Web Interactive Platform
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Access the interface
http://localhost:5173
```

### 2. Standalone Python Engine and Server
```bash
# Execute terminal benchmark calculation
python simcat_engine.py

# Or start the local production server
python server.py
```

---

## 6. Built-in Reaction Presets
1. **Standard Benchmark**: $N_2O$ decomposition over $Rh/Co_3O_4-Al_2O_3$ diluted with $SiC$ particles.
2. **CO Methanation (Sabatier Process)**: Highly exothermic test case over $Ni/Al_2O_3$ testing extreme thermal dissipation limits.
3. **Ammonia Synthesis**: High-pressure (100 bar) Haber-Bosch synthesis over promoted iron catalyst.
4. **Ethylene Epoxidation**: Partial selective oxidation over $Ag/\alpha-Al_2O_3$ carrier.

---

## 7. Development Roadmap
- Full 9-criteria gas-solid fixed-bed diagnostic engine
- Live mathematical formula inspector with dynamic numerical variable substitution
- 2D packed bed and catalyst pellet microkinetics cross-section visualizer
- Parametric sensitivity sweep curves (Weisz-Prater, Carberry, pressure drop, effectiveness)
- Executive audit certificate generator (Markdown, CSV, JSON export)
- Multiphase trickle-bed and slurry reactor extensions
- Axial temperature and concentration dynamic ODE numerical integrator (Runge-Kutta 4th order)
- Multi-component Stefan-Maxwell matrix solver
