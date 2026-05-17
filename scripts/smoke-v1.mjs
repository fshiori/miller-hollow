import { spawn } from "node:child_process";

const base = "http://localhost:8787";
const wsBase = "ws://localhost:8787";
const presetCounts = {
  official_basic_8: { players: 8, werewolf: 2, seer: 1, villager: 5 },
  official_basic_9: { players: 9, werewolf: 2, seer: 1, villager: 6 },
  official_basic_10: { players: 10, werewolf: 2, seer: 1, villager: 7 },
  official_basic_11: { players: 11, werewolf: 2, seer: 1, villager: 8 },
  official_basic_12: { players: 12, werewolf: 3, seer: 1, villager: 8 },
  official_basic_13: { players: 13, werewolf: 3, seer: 1, villager: 9 },
  official_basic_14: { players: 14, werewolf: 3, seer: 1, villager: 10 },
  official_basic_15: { players: 15, werewolf: 3, seer: 1, villager: 11 },
  official_basic_16: { players: 16, werewolf: 3, seer: 1, villager: 12 },
  official_basic_17: { players: 17, werewolf: 3, seer: 1, villager: 13 },
  official_basic_18: { players: 18, werewolf: 4, seer: 1, villager: 13 },
  official_roleflow_8: { players: 8, werewolf: 2, seer: 1, hunter: 1, villager: 4 },
  app_basic_8: { players: 8, werewolf: 2, seer: 1, witch: 1, villager: 4 },
  app_basic_12: { players: 12, werewolf: 3, seer: 1, witch: 1, villager: 7 },
  basic_8: { players: 8, werewolf: 2, seer: 1, witch: 1, villager: 4 }
};

const server = spawn("./node_modules/.bin/wrangler", ["dev", "--var", "MILLER_HOLLOW_TIMER_PROFILE:smoke"], {
  detached: true,
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForReady();
  const health = await get("/api/health");
  assert(health.ok === true, "health endpoint did not return ok");
  assert(health.storage === "durable_object_sqlite", "health endpoint returned unexpected storage");
  await expectHttpError("/api/rooms", 400, { presetId: "unsupported" });
  await expectHttpError("/api/rooms", 400, {
    customRoleSetup: {
      playerCount: 12,
      roles: { werewolf: 2, seer: 1, hunter: 1, villager: 8 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    }
  });
  const customRoom = await post("/api/rooms", {
    customRoleSetup: {
      playerCount: 12,
      roles: { werewolf: 3, seer: 1, witch: 1, hunter: 1, villager: 6 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    }
  });
  const customState = await get(`/api/rooms/${customRoom.roomId}/state`);
  assert(customState.settings.presetId === "custom_roleflow", "custom roleflow preset was not selected");
  assert(customState.seats.length === 12, "custom roleflow did not create expected seats");
  assert(customState.preset?.roleSummary?.some((entry) => entry.role === "witch" && entry.count === 1), "custom roleflow summary missing Witch");
  const thiefRoom = await post("/api/rooms", {
    customRoleSetup: {
      playerCount: 8,
      roles: { werewolf: 2, seer: 1, thief: 1, hunter: 1, villager: 3 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    }
  });
  const thiefState = await get(`/api/rooms/${thiefRoom.roomId}/state`);
  assert(thiefState.preset?.roleSummary?.some((entry) => entry.role === "thief" && entry.count === 1), "custom roleflow summary missing Thief");
  const cupidRoom = await post("/api/rooms", {
    customRoleSetup: {
      playerCount: 8,
      roles: { werewolf: 2, seer: 1, cupid: 1, villager: 4 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    }
  });
  const cupidState = await get(`/api/rooms/${cupidRoom.roomId}/state`);
  assert(cupidState.preset?.roleSummary?.some((entry) => entry.role === "cupid" && entry.count === 1), "custom roleflow summary missing Cupid");
  await smokeAllPresetStarts();
  console.log("Preset smoke passed");
  await smokeOfficialRoleflow();
  console.log("Roleflow smoke passed");
  await smokeDedicatedHostObserver();
  console.log("Dedicated host smoke passed");
  await smokeDedicatedHostAiFlow();
  console.log("Dedicated host AI smoke passed");
  const room = await post("/api/rooms", { presetId: "app_basic_8" });
  const joined = [];
  const spectatorTicket = await post(`/api/rooms/${room.roomId}/spectator-ticket`);
  assert(spectatorTicket.ticket, "spectator ticket was not returned");
  for (let index = 1; index <= 8; index += 1) {
    joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Smoke ${index}` }));
  }
  await expectHttpError(`/api/rooms/${room.roomId}/join`, 409, { nickname: "Overflow" });
  await expectHttpError(`/api/rooms/${room.roomId}/reconnect`, 403, {
    seatId: joined[0].seatId,
    token: "invalid-token"
  });
  await expectHttpError(`/api/rooms/${room.roomId}/socket-ticket`, 403, {
    seatId: joined[0].seatId,
    token: "invalid-token"
  });
  await expectHttpError(`/api/rooms/${room.roomId}/private?seatId=${joined[0].seatId}&token=invalid-token`, 403);
  await expectHttpError(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=invalid-token`, 403);
  await expectHttpError(`/api/rooms/${room.roomId}/reset`, 403, {
    seatId: joined[1].seatId,
    token: joined[1].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/host/lock`, 403, {
    seatId: joined[1].seatId,
    token: joined[1].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/host/advance-phase`, 403, {
    seatId: joined[1].seatId,
    token: joined[1].token
  });

  const reconnected = await post(`/api/rooms/${room.roomId}/reconnect`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  assert(reconnected.seatId === joined[0].seatId, "reconnect did not return the same seat");
  const diagnostics = await get(`/api/rooms/${room.roomId}/diagnostics?seatId=${joined[0].seatId}&token=${joined[0].token}`);
  assert(diagnostics.occupiedSeats === 8, "diagnostics did not report occupied seats");
  assert(typeof diagnostics.activeSpectators === "number", "diagnostics did not report active spectators");
  assert(!JSON.stringify(diagnostics).includes("token"), "diagnostics leaked token data");
  await post(`/api/rooms/${room.roomId}/host/disable-spectators`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/spectator-ticket`, 403);
  await post(`/api/rooms/${room.roomId}/host/enable-spectators`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await post(`/api/rooms/${room.roomId}/host/lock`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await post(`/api/rooms/${room.roomId}/host/unlock`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await post(`/api/rooms/${room.roomId}/host/transfer`, {
    seatId: joined[0].seatId,
    token: joined[0].token,
    targetSeatId: joined[1].seatId
  });
  await expectHttpError(`/api/rooms/${room.roomId}/host/lock`, 403, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await post(`/api/rooms/${room.roomId}/host/transfer`, {
    seatId: joined[1].seatId,
    token: joined[1].token,
    targetSeatId: joined[0].seatId
  });
  await expectSpectatorPublicOnly(room.roomId);
  await post(`/api/rooms/${room.roomId}/reset`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });

  await expectHttpError(`/api/rooms/${room.roomId}/start`, 409, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  for (const player of joined) {
    await socketSend(room.roomId, player, { type: "set_ready", ready: true }, undefined);
  }
  const readyState = await get(`/api/rooms/${room.roomId}/state`);
  assert(readyState.startEligibility?.canStart === true, "start eligibility did not become ready");
  await post(`/api/rooms/${room.roomId}/start`, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/start`, 409, {
    seatId: joined[0].seatId,
    token: joined[0].token
  });

  let privates = await privateViews(room.roomId, joined);
  const startedState = await get(`/api/rooms/${room.roomId}/state`);
  assert(!publicStateHasRoles(startedState), "public state leaked roles before endgame");
  assert(!JSON.stringify(startedState).includes("playerTokenHash"), "public state leaked token hashes");
  assert(!JSON.stringify(startedState).includes("socketTickets"), "public state leaked socket tickets");
  assert(!JSON.stringify(startedState).includes('"privateView"'), "public state leaked private views");
  assert(!startedState.game.endgameReveal, "public state revealed endgame before game ended");
  await expectSpectatorPublicOnly(room.roomId);
  await expectHttpError(`/api/rooms/${room.roomId}/observer-ticket`, 403, {
    seatId: joined[1].seatId,
    token: joined[1].token
  });
  await expectHttpError(`/api/rooms/${room.roomId}/observer-state?seatId=${joined[0].seatId}&token=${joined[0].token}`, 403);
  console.log("Player-host observer rejection smoke passed");

  const wolfIndexes = privates.map((view, index) => (view.role === "werewolf" ? index : -1)).filter((index) => index >= 0);
  const wolfIndex = wolfIndexes[0];
  const seerIndex = privates.findIndex((view) => view.role === "seer");
  const witchIndex = privates.findIndex((view) => view.role === "witch");
  assert(wolfIndex >= 0 && seerIndex >= 0 && witchIndex >= 0, "required roles were not assigned");
  assert(privates[wolfIndex].werewolfTeammates.length === 1, "werewolf teammate private view missing");
  assert(privates.filter((view) => view.role !== "seer").every((view) => Object.keys(view.seerResults).length === 0), "seer results leaked to non-Seer");

  await expectSocketError(room.roomId, joined[0], {
    type: "day_chat",
    message: "night chat should fail"
  });
  console.log("Night action rejection smoke passed");
  const villagerIndex = privates.findIndex((view) => view.role !== "werewolf");
  await expectSocketError(room.roomId, joined[villagerIndex], {
    type: "werewolf_chat",
    message: "non wolf chat should fail"
  });

  const wolfMessage = "Smoke wolf private chat";
  await socketSend(room.roomId, joined[wolfIndex], { type: "werewolf_chat", message: wolfMessage }, undefined);
  await delay(250);
  privates = await privateViews(room.roomId, joined);
  assert(privates[wolfIndex].phaseInteraction?.werewolfChat?.some((message) => message.message === wolfMessage), "werewolf chat missing from wolf private view");
  assert(!privates[villagerIndex].phaseInteraction?.werewolfChat, "werewolf chat leaked to non-werewolf private view");
  let publicState = await get(`/api/rooms/${room.roomId}/state`);
  assert(!JSON.stringify(publicState).includes(wolfMessage), "public state leaked werewolf chat");
  await expectSpectatorPublicOnly(room.roomId, wolfMessage);
  console.log("Werewolf chat smoke passed");

  const wolfTarget = privates[wolfIndex].legalTargets[0];
  await socketSend(room.roomId, joined[wolfIndex], { type: "propose_werewolf_target", targetId: wolfTarget }, undefined);
  await delay(250);
  privates = await privateViews(room.roomId, joined);
  assert(privates[wolfIndex].phaseInteraction?.werewolfTargetId === wolfTarget, "werewolf proposed target missing from wolf private view");
  assert(!JSON.stringify(await get(`/api/rooms/${room.roomId}/state`)).includes('"werewolfTargetId"'), "public state leaked werewolf proposed target");
  await socketSend(room.roomId, joined[wolfIndexes[0]], { type: "set_werewolf_ready", ready: true }, "night_werewolves");
  await socketSend(room.roomId, joined[wolfIndexes[1]], { type: "set_werewolf_ready", ready: true }, "night_seer");
  privates = await privateViews(room.roomId, joined);
  await socketSend(room.roomId, joined[seerIndex], {
    type: "night_action",
    targetId: privates[seerIndex].legalTargets[0]
  }, "night_witch");
  await socketSend(room.roomId, joined[witchIndex], {
    type: "night_action"
  }, "day_discussion");
  console.log("Night resolution smoke passed");

  const living = await livingSessions(room.roomId, joined);
  await socketSend(room.roomId, living[0], {
    type: "day_chat",
    message: "Smoke test day chat"
  }, "day_discussion");
  console.log("Day chat smoke passed");

  for (const player of await livingSessions(room.roomId, joined)) {
    await socketSend(room.roomId, player, { type: "set_day_ready", ready: true }, undefined);
  }
  await waitForPhase(room.roomId, "day_vote", 5_000);
  console.log("Day readiness smoke passed");
  const target = (await get(`/api/rooms/${room.roomId}/state`)).game.players.find((player) => player.alive).id;
  const votingPlayers = await livingSessions(room.roomId, joined);
  await socketSend(room.roomId, votingPlayers[0], { type: "vote", targetId: target }, undefined);
  publicState = await get(`/api/rooms/${room.roomId}/state`);
  assert(!JSON.stringify(publicState).includes('"votes"'), "public state leaked vote map");
  assert((publicState.game.voteResults ?? []).length === 0, "public state revealed vote results before vote resolution");
  console.log("Live vote hidden-info smoke passed");
  for (const player of votingPlayers.slice(1)) {
    await socketSend(room.roomId, player, { type: "vote", targetId: target }, undefined);
  }
  await waitForNotPhase(room.roomId, "day_vote", 5_000);
  publicState = await get(`/api/rooms/${room.roomId}/state`);
  assert(!publicStateHasRoles(publicState), "public state leaked roles after non-end vote");
  const voteResults = publicState.game.voteResults ?? [];
  assert(voteResults.length >= 1, "public state did not include vote results after vote resolution");
  const latestVoteResult = voteResults.at(-1);
  assert(latestVoteResult.votes.length === votingPlayers.length, "vote result did not include each living voter");
  assert(latestVoteResult.executedPlayerId === target, "vote result did not include executed player");
  assert(latestVoteResult.tally[target] === votingPlayers.length, "vote result tally did not include deliberate votes");
  const spectatorState = await spectatorStateView(room.roomId);
  assert((spectatorState.game.voteResults ?? []).length >= 1, "spectator state did not include vote results after vote resolution");
  console.log("V7 smoke passed");
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function waitForReady() {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    if (output.includes("Ready on")) return;
    await delay(250);
  }
  throw new Error(`Wrangler did not start:\n${output}`);
}

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function smokeAllPresetStarts() {
  for (const presetId of Object.keys(presetCounts)) {
    const expected = presetCounts[presetId];
    const room = await post("/api/rooms", { presetId });
    const joined = [await post(`/api/rooms/${room.roomId}/join`, { nickname: `${presetId} Host` })];
    const created = await get(`/api/rooms/${room.roomId}/state`);
    assert(created.settings.presetId === presetId, `${presetId} was not selected at create time`);
    assert(created.seats.length === expected.players, `${presetId} did not create the expected seats`);
    while (joined.length < expected.players) {
      joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `${presetId} ${joined.length + 1}` }));
    }
    await expectHttpError(`/api/rooms/${room.roomId}/join`, 409, { nickname: `${presetId} Overflow` });
    for (const player of joined) {
      await socketSend(room.roomId, player, { type: "set_ready", ready: true }, undefined);
    }
    await waitForEligibility(room.roomId, true);
    await post(`/api/rooms/${room.roomId}/start`, {
      seatId: joined[0].seatId,
      token: joined[0].token
    });
    const started = await get(`/api/rooms/${room.roomId}/state`);
    assert(started.game?.phase === (presetId === "official_roleflow_8" ? "night_seer" : "night_werewolves"), `${presetId} did not start`);
    assert(started.preset?.id === presetId, `${presetId} public preset missing`);
    assert(!publicStateHasRoles(started), `${presetId} public state leaked roles`);
    assert(!started.game.endgameReveal, `${presetId} revealed endgame early`);
    const privates = await privateViews(room.roomId, joined);
    assertRoleCounts(privates, expected, presetId);
    const wolf = privates.find((view) => view.role === "werewolf");
    assert(wolf.werewolfTeammates.length === expected.werewolf - 1, `${presetId} werewolf teammates mismatch`);
  }
}

async function smokeOfficialRoleflow() {
  const room = await post("/api/rooms", { presetId: "official_roleflow_8" });
  const joined = [];
  for (let index = 1; index <= 8; index += 1) {
    joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Roleflow ${index}` }));
  }
  for (const player of joined) {
    await socketSend(room.roomId, player, { type: "set_ready", ready: true }, undefined);
  }
  await waitForEligibility(room.roomId, true);
  await post(`/api/rooms/${room.roomId}/start`, { seatId: joined[0].seatId, token: joined[0].token });
  let privates = await privateViews(room.roomId, joined);
  const seerIndex = privates.findIndex((view) => view.role === "seer");
  const wolfIndexes = privates.map((view, index) => (view.role === "werewolf" ? index : -1)).filter((index) => index >= 0);
  const hunterIndex = privates.findIndex((view) => view.role === "hunter");
  assert(seerIndex >= 0 && wolfIndexes.length === 2 && hunterIndex >= 0, "roleflow required roles missing");
  assert((await get(`/api/rooms/${room.roomId}/state`)).game.phase === "night_seer", "roleflow did not start with Seer");

  await socketSend(room.roomId, joined[seerIndex], { type: "night_action", targetId: privates[seerIndex].legalTargets[0] }, "night_werewolves");
  privates = await privateViews(room.roomId, joined);
  const wolfTarget = privates[wolfIndexes[0]].legalTargets.find((targetId) => targetId !== joined[hunterIndex].seatId);
  assert(wolfTarget, "roleflow could not find a non-Hunter Werewolf target");
  const sheriffIndex = joined.findIndex((player, index) => index !== hunterIndex && player.seatId !== wolfTarget);
  assert(sheriffIndex >= 0, "roleflow could not find a living Sheriff candidate");
  await socketSend(room.roomId, joined[wolfIndexes[0]], { type: "propose_werewolf_target", targetId: wolfTarget }, undefined);
  for (const wolfIndex of wolfIndexes) {
    await socketSend(room.roomId, joined[wolfIndex], { type: "set_werewolf_ready", ready: true }, wolfIndex === wolfIndexes.at(-1) ? "day_discussion" : undefined);
  }

  await post(`/api/rooms/${room.roomId}/host/open-sheriff-election`, { seatId: joined[0].seatId, token: joined[0].token });
  await waitForPhase(room.roomId, "sheriff_election", 5_000);
  for (const player of joined) {
    await socketSend(room.roomId, player, { type: "sheriff_vote", targetId: joined[sheriffIndex].seatId }, undefined);
  }
  await waitForPhase(room.roomId, "day_discussion", 5_000);
  let state = await get(`/api/rooms/${room.roomId}/state`);
  assert(state.game.sheriff.holderId === joined[sheriffIndex].seatId, "roleflow Sheriff was not elected");

  await post(`/api/rooms/${room.roomId}/host/advance-phase`, { seatId: joined[0].seatId, token: joined[0].token });
  await waitForPhase(room.roomId, "day_vote", 5_000);
  const living = await livingSessions(room.roomId, joined);
  for (const player of living) {
    await socketSend(room.roomId, player, { type: "vote", targetId: joined[hunterIndex].seatId }, undefined);
  }
  await waitForPhase(room.roomId, "hunter_revenge", 5_000);
  await socketSend(room.roomId, joined[hunterIndex], { type: "hunter_shot", targetId: joined[wolfIndexes[0]].seatId }, undefined);
  await waitForNotPhase(room.roomId, "hunter_revenge", 5_000);
  state = await get(`/api/rooms/${room.roomId}/state`);
  assert((state.game.voteResults ?? []).at(-1)?.votes.some((vote) => vote.weight === 2), "roleflow vote reveal did not include Sheriff weight");
}

async function smokeDedicatedHostObserver() {
  const room = await post("/api/rooms", {
    hostMode: "dedicated_host",
    customRoleSetup: {
      playerCount: 8,
      roles: { werewolf: 2, seer: 1, witch: 1, villager: 4 },
      sheriffEnabled: true,
      nightOrder: "official",
      werewolfTimeoutNoKill: true
    }
  });
  assert(room.hostToken, "dedicated host token was not returned");
  let state = await get(`/api/rooms/${room.roomId}/state`);
  assert(state.settings.hostMode === "dedicated_host", "dedicated host mode was not public");
  assert(state.seats.every((seat) => !seat.nickname), "dedicated host occupied a player seat");
  const joined = [];
  for (let index = 1; index <= 8; index += 1) {
    joined.push(await post(`/api/rooms/${room.roomId}/join`, { nickname: `Dedicated ${index}` }));
  }
  for (const player of joined) {
    await socketSend(room.roomId, player, { type: "set_ready", ready: true }, undefined);
  }
  await waitForEligibility(room.roomId, true);
  await post(`/api/rooms/${room.roomId}/start`, { seatId: "dedicated-host", token: room.hostToken });
  state = await get(`/api/rooms/${room.roomId}/state`);
  assert(!publicStateHasRoles(state), "dedicated public state leaked roles before endgame");
  const observer = await observerState(room.roomId, { seatId: "dedicated-host", token: room.hostToken });
  assert(observer.observer?.players?.some((player) => player.role === "werewolf"), "dedicated host observer did not reveal roles");
  assert(!JSON.stringify(observer).includes("playerTokenHash"), "dedicated observer leaked token hashes");
  assert(!JSON.stringify(observer).includes("socketTickets"), "dedicated observer leaked socket tickets");
  await expectObserverSocket(room.roomId, { seatId: "dedicated-host", token: room.hostToken });
}

async function smokeDedicatedHostAiFlow() {
  const room = await post("/api/rooms", {
    hostMode: "dedicated_host",
    presetId: "official_roleflow_8"
  });
  assert(room.hostToken, "AI flow dedicated host token was not returned");
  await post(`/api/rooms/${room.roomId}/host/add-ai-players`, { seatId: "dedicated-host", token: room.hostToken });
  let state = await get(`/api/rooms/${room.roomId}/state`);
  assert(state.seats.every((seat) => seat.nickname && seat.controller === "ai" && seat.ready), "AI players did not fill ready seats");
  assert(state.startEligibility?.canStart === true, "AI room was not startable");
  await post(`/api/rooms/${room.roomId}/start`, { seatId: "dedicated-host", token: room.hostToken });
  state = await get(`/api/rooms/${room.roomId}/state`);
  assert(!publicStateHasRoles(state), "AI public state leaked roles before endgame");

  state = await post(`/api/rooms/${room.roomId}/host/ai-step`, { seatId: "dedicated-host", token: room.hostToken, stepType: "night_action" });
  assert(state.aiStep?.stepType === "night_action", "AI night step summary missing");
  assert(state.game?.phase === "night_werewolves", "AI Seer action did not advance to Werewolves");
  state = await post(`/api/rooms/${room.roomId}/host/ai-step`, { seatId: "dedicated-host", token: room.hostToken, stepType: "night_action" });
  assert(state.game?.phase === "day_discussion", "AI Werewolf action did not advance to discussion");

  const chatCountBefore = state.chatMessages.length;
  state = await post(`/api/rooms/${room.roomId}/host/ai-step`, { seatId: "dedicated-host", token: room.hostToken, stepType: "day_chat" });
  assert(state.game?.phase === "day_discussion", "AI day chat advanced the phase");
  assert(state.chatMessages.length > chatCountBefore, "AI day chat did not add public messages");
  assert((state.phaseInteraction?.dayReadyCount ?? 0) === 0, "AI day chat also readied players");

  state = await post(`/api/rooms/${room.roomId}/host/ai-step`, { seatId: "dedicated-host", token: room.hostToken, stepType: "day_ready" });
  assert(state.game?.phase === "day_vote", "AI day ready did not advance to vote");
  assert((state.game?.voteResults ?? []).length === 0, "AI day ready revealed votes before voting");

  state = await post(`/api/rooms/${room.roomId}/host/ai-step`, { seatId: "dedicated-host", token: room.hostToken, stepType: "vote", mode: "all" });

  state = await get(`/api/rooms/${room.roomId}/state`);
  assert((state.game?.voteResults ?? []).length > 0, "AI flow did not reveal a resolved vote");
  assert(state.chatMessages.some((message) => message.message.includes("AI")), "AI flow did not emit day discussion chat");
  const observer = await observerState(room.roomId, { seatId: "dedicated-host", token: room.hostToken });
  assert(observer.observer?.players?.every((player) => player.role), "AI observer did not reveal roles to dedicated host");
}

async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  if (!response.ok) throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function expectHttpError(path, status, body) {
  const response = await fetch(`${base}${path}`, {
    method:
      body ||
      path.includes("/join") ||
      path.includes("/reconnect") ||
      path.includes("/start") ||
      path.includes("/spectator-ticket")
        ? "POST"
        : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (response.status !== status) {
    const text = await response.text();
    throw new Error(`${path} expected ${status}, got ${response.status}: ${text}`);
  }
}

async function privateViews(roomId, joined) {
  return Promise.all(
    joined.map(async (player) => {
      const payload = await get(`/api/rooms/${roomId}/private?seatId=${player.seatId}&token=${player.token}`);
      return payload.privateView;
    })
  );
}

async function livingSessions(roomId, joined) {
  const state = await get(`/api/rooms/${roomId}/state`);
  const livingSeatIds = new Set(state.game.players.filter((player) => player.alive).map((player) => player.id));
  return joined.filter((player) => livingSeatIds.has(player.seatId));
}

async function socketSend(roomId, player, message, expectedPhase) {
  const ticket = await socketTicket(roomId, player);
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/socket?ticket=${ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`socket timeout for ${JSON.stringify(message)}`)), 10_000);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(message));
      if (!expectedPhase) {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "error") {
        clearTimeout(timeout);
        reject(new Error(payload.error));
      }
      if (expectedPhase && payload.type === "room_view" && payload.room.game?.phase === expectedPhase) {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function expectSocketError(roomId, player, message) {
  const ticket = await socketTicket(roomId, player);
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/socket?ticket=${ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`expected socket error for ${JSON.stringify(message)}`)), 10_000);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(message));
    });
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "error") {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function expectSpectatorPublicOnly(roomId, forbiddenText) {
  const ticketPayload = await post(`/api/rooms/${roomId}/spectator-ticket`);
  assert(ticketPayload.ticket, "spectator ticket was not returned");
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/spectator-socket?ticket=${ticketPayload.ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("expected spectator room view")), 10_000);
    let sawRoomView = false;
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "private_view") {
        clearTimeout(timeout);
        reject(new Error("spectator received private view"));
      }
      if (payload.type === "room_view") {
        const body = JSON.stringify(payload);
        if (body.includes("playerTokenHash") || body.includes("socketTickets") || body.includes('"privateView"') || (forbiddenText && body.includes(forbiddenText))) {
          clearTimeout(timeout);
          reject(new Error("spectator public view leaked hidden state"));
          return;
        }
        sawRoomView = true;
        socket.send(JSON.stringify({ type: "night_action" }));
      }
      if (sawRoomView && payload.type === "error") {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function spectatorStateView(roomId) {
  const ticket = await post(`/api/rooms/${roomId}/spectator-ticket`, {});
  assert(ticket.ticket, "spectator ticket missing");
  return get(`/api/rooms/${roomId}/state`);
}

async function observerState(roomId, player) {
  const payload = await get(`/api/rooms/${roomId}/observer-state?seatId=${player.seatId}&token=${player.token}`);
  return payload.room;
}

async function expectObserverSocket(roomId, player) {
  const ticketPayload = await post(`/api/rooms/${roomId}/observer-ticket`, {
    seatId: player.seatId,
    token: player.token
  });
  assert(ticketPayload.ticket, "observer ticket was not returned");
  const socket = new WebSocket(`${wsBase}/api/rooms/${roomId}/observer-socket?ticket=${ticketPayload.ticket}`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("expected observer view")), 10_000);
    let sawObserverView = false;
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.type === "observer_view") {
        const body = JSON.stringify(payload);
        if (!body.includes('"observer"') || body.includes("playerTokenHash") || body.includes("socketTickets")) {
          clearTimeout(timeout);
          reject(new Error("observer view missing hidden state or leaked auth state"));
          return;
        }
        sawObserverView = true;
        socket.send(JSON.stringify({ type: "vote", targetId: "abstain" }));
      }
      if (sawObserverView && payload.type === "error") {
        clearTimeout(timeout);
        socket.close();
        resolve();
      }
    });
    socket.addEventListener("error", reject);
  });
}

async function socketTicket(roomId, player) {
  const payload = await post(`/api/rooms/${roomId}/socket-ticket`, {
    seatId: player.seatId,
    token: player.token
  });
  assert(payload.ticket, "socket ticket was not returned");
  return payload.ticket;
}

async function waitForPhase(roomId, phase, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.game?.phase === phase) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for phase ${phase}`);
}

async function waitForNotPhase(roomId, phase, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.game?.phase !== phase) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting to leave phase ${phase}`);
}

async function waitForEligibility(roomId, expectedCanStart) {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    const state = await get(`/api/rooms/${roomId}/state`);
    if (state.startEligibility?.canStart === expectedCanStart) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for start eligibility ${expectedCanStart}`);
}

function publicStateHasRoles(state) {
  return state.game.players.some((player) => player.role);
}

function assertRoleCounts(privates, expected, presetId) {
  const counts = privates.reduce((acc, view) => {
    acc[view.role] = (acc[view.role] ?? 0) + 1;
    return acc;
  }, {});
  for (const role of ["werewolf", "seer", "witch", "hunter", "villager"]) {
    assert((counts[role] ?? 0) === (expected[role] ?? 0), `${presetId} expected ${expected[role] ?? 0} ${role}, got ${counts[role] ?? 0}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
