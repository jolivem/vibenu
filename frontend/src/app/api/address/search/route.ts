import { NextRequest, NextResponse } from "next/server";
import { GeoApiAddressProvider } from "@/server-modules/address/infrastructure/geo-api-address.provider";
import { AddressSearchUseCase } from "@/server-modules/address/application/address-search.use-case";

const provider = new GeoApiAddressProvider();
const useCase = new AddressSearchUseCase(provider);

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json(
      { message: "Le paramètre q doit contenir au moins 3 caractères." },
      { status: 400 },
    );
  }

  const result = await useCase.execute(q);
  return NextResponse.json(result);
}
