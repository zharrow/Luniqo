import { Composition } from "remotion";
import { LuniqoMarketing } from "./LuniqoMarketing";
import { LuniqoPromo } from "./LuniqoPromo";
import { LuniqoPremium } from "./LuniqoPremium";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LuniqoMarketing"
        component={LuniqoMarketing}
        durationInFrames={30 * 45} // 45 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LuniqoPromo"
        component={LuniqoPromo}
        durationInFrames={30 * 50} // 50 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LuniqoPremium"
        component={LuniqoPremium}
        durationInFrames={30 * 155} // 155 seconds at 30fps (150s content + 5s buffer)
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
