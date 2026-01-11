# Diagrama de Gantt - Distribución de Carga de Trabajo TFG (Calendario Oficial)

Este diagrama refleja vuestra disponibilidad real, incluyendo el periodo de **Evaluación Intermedia** coincidente con las prácticas y la **Defensa Final** en junio.

```mermaid
gantt
    title Cronograma TFG - WhistleEATS (Ajustado a Fechas Oficiales)
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d
    
    %% Hitos e Hitos Académicos
    section Hitos Académicos
    Inicio Proyecto               :milestone, m0, 2026-01-01, 0d
    Inicio Ev. Intermedia & Prácticas :milestone, m_inter, 2026-02-07, 0d
    Fin Prácticas & Ev. Intermedia    :milestone, m_fin_prac, 2026-05-22, 0d
    Entrega Memoria Final             :milestone, m_entrega, 2026-05-28, 0d
    Defensa (Ev. Ordinaria)           :milestone, m_defensa, 2026-06-02, 2d

    section Fase 1: Sprint Inicial (Ene 1 - Feb 6)
    Configuración & Docker (Todos)   :active, all_1, 2026-01-01, 5d
    Arquitectura SAP CAP (M1)        :m1_1, after all_1, 10d
    Diseño UI Tailwind (M2)          :m2_1, after all_1, 12d
    Modelado de Datos (M3)           :m3_1, after all_1, 10d
    Auth System & Roles (M1)         :crit, m1_2, after m1_1, 10d

    section Fase 2: Ev. Intermedia & Prácticas (Feb 7 - May 22)
    %% El ritmo baja un 60% aproximadamente
    Core Cliente & Pedidos (M2)      :m2_2, 2026-02-07, 45d
    Lógica de Negocio en CAP (M1)    :m1_3, 2026-02-07, 40d
    Paneles de Gestión (M3)          :m3_3, 2026-02-15, 50d
    Integración Supabase DB (M3)     :m3_2, after m3_3, 20d
    Refactor & Testing (Todos)       :all_2, after m3_2, 30d

    section Fase 3: Cierre & Defensa (May 23 - Jun 4)
    Redacción Memoria Final (Todos)  :crit, doc, 2026-05-23, 7d
    Ensayo de Defensa                :all_3, after doc, 3d
    Días de Defensa (Ev. Ordinaria)  :active, m_def_days, 2026-06-02, 3d
```
