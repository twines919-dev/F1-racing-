
using UnityEngine;

public class MobileInput : MonoBehaviour
{
    public CarController car;

    public void LeftDown()
    {
        car.SetSteering(-1f);
    }

    public void RightDown()
    {
        car.SetSteering(1f);
    }

    public void SteeringUp()
    {
        car.SetSteering(0f);
    }

    public void GasDown()
    {
        car.SetAcceleration(1f);
    }

    public void GasUp()
    {
        car.SetAcceleration(0f);
    }

    public void BrakeDown()
    {
        car.SetBrake(1f);
    }

    public void BrakeUp()
    {
        car.SetBrake(0f);
    }
}
