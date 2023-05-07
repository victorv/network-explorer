import { ONE_DAY_MS, veHNTWoDecimal } from "@/app/stats/utils"
import { BN } from "@coral-xyz/anchor"
import { currentEpoch } from "@helium/helium-sub-daos-sdk"
import { IOT_MINT, MOBILE_MINT, amountAsNum } from "@helium/spl-utils"
import { fetchSubDaoEpochInfo } from "../api/utils/fetchSubDaoEpochInfo"
import { fetchUnixTimestap } from "../api/utils/fetchUnixTimestamp"
import { DelegationHistoryGraph } from "./DelegationHistoryGraph"

export const DelegationHistory = async () => {
  const unixTime = await fetchUnixTimestap()
  const epoch = currentEpoch(new BN(unixTime)).toNumber()
  const mobileEpochQueries: any[] = []
  const iotEpochsQueries: any[] = []

  const epochsSinceMigration = epoch - 19467
  for (let offset = 1; offset <= Math.min(epochsSinceMigration, 30); offset++) {
    if (epoch - offset >= 19467) {
      mobileEpochQueries.push(fetchSubDaoEpochInfo(MOBILE_MINT, offset))
      iotEpochsQueries.push(fetchSubDaoEpochInfo(IOT_MINT, offset))
    }
  }

  const [mobileEpochs, iotEpochs] = await Promise.all([
    await Promise.all(mobileEpochQueries),
    await Promise.all(iotEpochsQueries),
  ])

  const getCleanedData = () => {
    return mobileEpochs
      .map((mEpoch, index) => {
        const iotInfo = iotEpochs[index].info
        const mobileInfo = mEpoch.info
        // need to pass date as a number to client side
        const date = amountAsNum(mobileInfo.epoch, 0) * ONE_DAY_MS

        const mobileDelegated = veHNTWoDecimal(
          mobileInfo.vehntAtEpochStart.toString()
        )
        const iotDelegated = veHNTWoDecimal(
          iotInfo.vehntAtEpochStart.toString()
        )
        const percentIot =
          (iotDelegated / (mobileDelegated + iotDelegated)) * 100
        return {
          iotDelegated,
          mobileDelegated,
          percentIot,
          date,
        }
      })
      .reverse()
  }

  return (
    <div>
      <h2 className="flex-1 text-lg text-zinc-600 dark:text-zinc-100">
        Delegated HNT
      </h2>
      <div className="w-50 h-64 pt-2">
        <DelegationHistoryGraph data={getCleanedData()} />
      </div>
    </div>
  )
}
