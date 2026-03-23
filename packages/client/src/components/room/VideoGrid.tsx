import {
  GridLayout,
  ParticipantTile,
  useTracks,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  );

  if (screenShareTrack) {
    return (
      <FocusLayoutContainer style={{ height: "100%" }}>
        <FocusLayout trackRef={screenShareTrack} />
        <CarouselLayout tracks={tracks.filter((t) => t.source !== Track.Source.ScreenShare)}>
          <ParticipantTile />
        </CarouselLayout>
      </FocusLayoutContainer>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}
