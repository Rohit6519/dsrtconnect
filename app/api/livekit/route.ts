import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");

  if (!room || !username) {
    return NextResponse.json(
      { error: 'Missing "room" or "username" parameter' },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // Debug which exact variable is missing
  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { 
        error: `Missing in .env.local -> API_KEY: ${Boolean(apiKey)}, API_SECRET: ${Boolean(apiSecret)}, URL: ${Boolean(wsUrl)}` 
      },
      { status: 500 }
    );
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: "10h",
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}