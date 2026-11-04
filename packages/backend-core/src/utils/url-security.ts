
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export async function validateExternalUrl(url: URL): Promise<void> {
    const hostname = url.hostname;

    if (
        !hostname ||
        hostname === "localhost" ||
        hostname.endsWith(".localhost")
    ) {
        throw new Error("Requests to localhost are not allowed");
    }

    let addresses: string[];

    try {
        if (ipaddr.isValid(hostname)) {
            addresses = [hostname];
        } else {
            const results = await lookup(hostname, { all: true });
            addresses = results.map((result) => result.address);
        }
    } catch {
        throw new Error("Unable to resolve destination hostname");
    }

    if (addresses.length === 0) {
        throw new Error("Destination hostname has no IP addresses");
    }

    for (const address of addresses) {
        if (!ipaddr.isValid(address)) {
            throw new Error("Invalid destination IP address");
        }

        const parsedAddress = ipaddr.parse(address);

        if (parsedAddress.range() !== "unicast") {
            throw new Error("Requests to private or reserved IP addresses are not allowed");
        }
    }
}
