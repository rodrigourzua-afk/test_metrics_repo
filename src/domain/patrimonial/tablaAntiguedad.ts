// Feature: cmf-prudential-metrics — Motor_Patrimonial: Tabla de Antigüedad de Activos Impagos

export interface ActivoImpago {
  monto: number;
  diasMora: number;
}

export type TramoAntiguedad = '0-30' | '31-60' | '61-90' | '91-180' | '181+';

function resolverTramo(diasMora: number): TramoAntiguedad {
  if (diasMora <= 30) return '0-30';
  if (diasMora <= 60) return '31-60';
  if (diasMora <= 90) return '61-90';
  if (diasMora <= 180) return '91-180';
  return '181+';
}

export class AplicadorTablaAntiguedad {
  /**
   * Calcula la deducción total por activos impagos aplicando la tabla de antigüedad.
   * @param activosImpagos Lista de activos con monto y días de mora
   * @param tablaAntiguedad Mapa de tramo → porcentaje de deducción (0-1)
   * @returns Suma total de deducciones
   */
  calcularDeduccion(
    activosImpagos: ActivoImpago[],
    tablaAntiguedad: Record<string, number>
  ): number {
    return activosImpagos.reduce((total, activo) => {
      const tramo = resolverTramo(activo.diasMora);
      const porcentaje = tablaAntiguedad[tramo] ?? 0;
      return total + activo.monto * porcentaje;
    }, 0);
  }
}
