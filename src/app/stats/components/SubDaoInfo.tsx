import { StatItem } from "@/app/stats/components/StatItem"
import { Icon, StatsList } from "@/app/stats/components/StatsList"
import { fetcher, humanReadableVeToken } from "@/app/stats/utils"
import { BN } from "@coral-xyz/anchor"
import {
  IOT_MINT,
  MOBILE_MINT,
  humanReadable,
  humanReadableBigint,
  numberWithCommas,
  toNumber,
} from "@helium/spl-utils"
import { PublicKey } from "@solana/web3.js"
import { fetchSubDaoGovernanceStats } from "../utils/fetchGovernanceMetrics"
import { fetchMint } from "../utils/fetchMint"
import { fetchSubDaoEpochInfo } from "../utils/fetchSubDaoEpochInfo"
import { fetchSubDaoTreasuryInfo } from "../utils/fetchSubDaoTreasuryInfo"
import { fetchTokenAccount } from "../utils/fetchTokenAccount"
import {
  getLatestSubNetworkEmissions,
  getRemainingEmissions,
} from "../utils/remainingEmissions"
import { SubDao } from "../utils/types"

type SubDaoType = {
  title: string
  activeUrl: string
  link: string
  linkText: string
  icon: Icon
  subDaoMint: PublicKey
  maxDescription: string
  activeDetails: string
}

const MOBILE_INFO: SubDaoType = {
  title: "MOBILE",
  activeUrl: "https://mobile-rewards.oracle.helium.io/active-devices",
  link: "https://docs.helium.com/tokens/mobile-token/",
  linkText: "Learn More About MOBILE",
  icon: "mobile",
  subDaoMint: MOBILE_MINT,
  maxDescription:
    "This is an upper limit that will not be reached and does not consider future MOBILE burn. Reason: Daily emissions are currently only 86% of scheduled emissions, as not all rewardable entities (service providers, and oracles) exist or currently receive rewards.",
  activeDetails: " This exclusively includes active gateways (not radios).",
}

const IOT_INFO: SubDaoType = {
  title: "IOT",
  activeUrl: "https://iot-rewards.oracle.helium.io/active-devices",
  link: "https://docs.helium.com/tokens/iot-token/",
  linkText: "Learn More About IOT",
  icon: "iot",
  subDaoMint: IOT_MINT,
  maxDescription:
    "This is an upper limit that will not be reached and does not consider future IOT burn. Reason: Daily emissions are currently only 93% of scheduled emissions, as oracles do not currently receive rewards.",
  activeDetails: "",
}

export const SubDaoInfo = async ({ subDao }: { subDao: SubDao }) => {
  const {
    activeUrl,
    activeDetails,
    link,
    linkText,
    title,
    icon,
    subDaoMint,
    maxDescription,
  } = subDao === "mobile" ? MOBILE_INFO : IOT_INFO
  const [activeCount, mintInfo, epochInfo, treasuryInfo, governanceMetrics] =
    await Promise.all([
      fetcher(activeUrl),
      fetchMint(subDaoMint),
      fetchSubDaoEpochInfo(subDao),
      fetchSubDaoTreasuryInfo(subDaoMint),
      fetchSubDaoGovernanceStats(subDao),
    ])

  const treasuryTokenAcct = await fetchTokenAccount(treasuryInfo.info?.treasury)
  const mintSupplyNum =
    toNumber(mintInfo.info?.info.supply, mintInfo?.info?.info || 6) || 0
  const treasuryHntNum = toNumber(treasuryTokenAcct.info?.amount, 8) || 1
  const swap = mintSupplyNum / treasuryHntNum

  const remainingEmissions = Math.round(
    getRemainingEmissions(new Date(), subDao)
  )
  const maxSupply =
    mintInfo.info?.info.supply! + BigInt(remainingEmissions) * BigInt(1000000)

  const supplyStaked = governanceMetrics.total.hnt
    .mul(new BN(10000))
    .div(new BN(mintInfo.info?.info.supply!))

  return (
    <StatsList title={title} link={link} linkText={linkText} icon={icon}>
      <StatItem
        label="Utility Score"
        value={humanReadableBigint(epochInfo.info?.utilityScore, 12, 0)}
        tooltip={{
          description: "Utility score for the most recently completed epoch.",
          cadence: "Daily",
          id: "Utility Score",
        }}
      />
      <StatItem
        label="Active Hotspots"
        value={activeCount.count || 0}
        tooltip={{
          description: `Hotspots active in past 24h.${activeDetails}`,
          cadence: "Live",
          id: `Active Hotspots ${title}`,
        }}
      />
      <StatItem
        label="veHNT delegated"
        value={humanReadableVeToken(
          epochInfo.info?.vehntAtEpochStart.toString() || "0",
          8
        )}
        tooltip={{
          description: `veHNT delegated to the ${title} subDAO at the start of the most recently completed epoch.`,
          cadence: "Daily",
          id: `${title} veHNT delegated`,
        }}
      />
      <StatItem
        label="DC Burned (24h)"
        value={humanReadable(epochInfo.info?.dcBurned, 0)}
        tooltip={{
          description: `DC burned for data transfer by the ${title} subDAO during the most recently completed epoch.`,
          cadence: "Daily",
          id: `${title} DC Burned (24h)`,
        }}
      />
      <StatItem
        label="Treasury (HNT)"
        value={humanReadableBigint(
          treasuryTokenAcct.info?.amount || BigInt(0),
          8,
          0
        )}
        tooltip={{
          description: `Current funding of ${title}'s treasury.`,
          cadence: "Live",
          id: `${title} Treasury (HNT)`,
        }}
      />
      <StatItem
        label="Supply"
        value={humanReadableBigint(
          mintInfo.info?.info.supply!,
          mintInfo?.info?.info.decimals || 0,
          0
        )}
        tooltip={{
          description: `Current supply of ${title}.`,
          cadence: "Live",
          id: `${title} Supply`,
        }}
      />
      <StatItem
        label="Max Supply"
        value={humanReadableBigint(
          maxSupply,
          mintInfo?.info?.info.decimals || 0,
          0
        )}
        tooltip={{
          description: `Maximum supply of ${title} derived by current supply plus remaining emissions. ${maxDescription}`,
          cadence: "Live",
          id: `${title} Max Supply`,
        }}
      />
      <StatItem
        label="Daily Emissions"
        value={numberWithCommas(
          getLatestSubNetworkEmissions(new Date(), subDao)
        )}
        tooltip={{
          description: `Amount of ${title} emitted each day.`,
          cadence: "Constant",
          id: `${title} Daily Emissions`,
        }}
      />
      <StatItem
        label="Estimated Swap"
        unit={`${title}/HNT`}
        value={Math.round(swap)}
        tooltip={{
          description: `Estimated swap rate for ${title} to HNT. This is a floor that is guaranteed by the treasury. You may find better swap rates on DEXs.`,
          cadence: "Daily",
          id: `${title} Estimated Swap`,
        }}
      />
      <StatItem
        label="Supply Staked"
        value={`${supplyStaked.toNumber() / 100}%`}
        tooltip={{
          description: `Percent of current ${title} which is staked as ve${title} on Realms.`,
          id: `${title} Supply Staked`,
        }}
      />
    </StatsList>
  )
}
