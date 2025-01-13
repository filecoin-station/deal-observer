import { InfluxDB, Point } from '@influxdata/influxdb-client'
import createDebug from 'debug'

const debug = createDebug('spark:observer:telemetry')

export const createInflux = token => {
  const influx = new InfluxDB({
    url: 'https://eu-central-1-1.aws.cloud2.influxdata.com',
    // bucket permissions: spark-evaluate:read spark-observer:write
    token
  })
  const writeClient = influx.getWriteApi(
    'Filecoin Station', // org
    'spark-observer', // bucket
    'ms' // precision
  )
  setInterval(() => {
    writeClient.flush().catch(console.error)
  }, 10_000).unref()

  return {
    influx,

    /**
     * @param {string} name
     * @param {(p: Point) => void} fn
     */
    recordTelemetry: (name, fn) => {
      const point = new Point(name)
      fn(point)
      writeClient.writePoint(point)
      debug('%s %o', name, point)
    }
  }
}

export { Point }
